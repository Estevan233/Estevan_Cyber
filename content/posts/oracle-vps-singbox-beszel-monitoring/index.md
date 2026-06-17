---
title: "Oracle VPS 代理节点与 Beszel 监控面板部署复盘"
date: 2026-06-17
draft: false
tags: ["VPS", "Oracle Cloud", "sing-box", "Docker", "Beszel", "Hysteria2", "VLESS Reality"]
summary: "记录一次 Oracle VPS 节点与 Beszel 监控面板部署：从 HY2 超时排查、本机与云防火墙边界，到 Docker 备用节点和 VPS 状态面板接入。"
---

这篇文章记录一次比较典型的 VPS 运维复盘：在一台 Oracle Cloud VPS 上部署 `sing-box` 节点，同时安装 Beszel 监控面板，用来观察 VPS 的 CPU、内存、磁盘、网络和 Docker 容器状态。

这不是“复制命令就完事”的流水账。真正值得记录的是几个边界：

```text
sing-box 负责代理协议
Docker 负责服务隔离和备用部署
iptables 负责服务器本机防火墙
Oracle Security List / NSG 负责云厂商外层防火墙
Beszel Hub 负责展示状态
Beszel Agent 负责采集状态
```

一旦这些边界混在一起，排障就会变成玄学表演。命令敲得越快，错得越稳定。

---

## 一、目标结构

这次的目标很明确：

```text
Oracle VPS:
  sing-box native:
    TCP 443   -> VLESS Reality
    UDP 54321 -> Hysteria2

  sing-box docker backup:
    TCP 8443 -> VLESS Reality
    UDP 8444 -> Hysteria2

  Beszel:
    TCP 8090 -> Hub dashboard
    TCP 45876 -> Agent listen port
```

其中，`VLESS Reality` 作为主力 TCP 入口，`Hysteria2` 作为 UDP/QUIC 方向的备用方案。Docker 版 sing-box 不抢原生服务端口，只做备用实例，避免两个服务在同一个端口上互相抢麦。

---

## 二、先排查 HY2 超时

最开始的问题是：Hysteria2 客户端连接超时。

服务器上 sing-box 服务是正常的：

```bash
sudo systemctl status sing-box --no-pager -l
sudo ss -lntup
```

可以看到 sing-box 正在监听 UDP 端口：

```text
udp   *:54321   users:(("sing-box", ...))
```

这说明服务不是没启动。下一步看本机防火墙：

```bash
sudo iptables -S
```

Oracle Ubuntu 镜像默认有一套 `iptables` 规则，典型结构是：

```text
-A INPUT -p tcp --dport 22 -j ACCEPT
-A INPUT -j REJECT --reject-with icmp-host-prohibited
```

也就是说，除了 SSH，其他新入站流量直接被本机拒绝。HY2 端口虽然监听着，但包到了服务器门口就被扔了。这个场景很常见：服务跑了，但防火墙没开，于是客户端只看到“超时”，然后人开始怀疑协议、客户端、宇宙射线，唯独忘了门没开。

放行 HY2：

```bash
sudo iptables -I INPUT 5 -p udp --dport 54321 -j ACCEPT
sudo netfilter-persistent save
```

再放行 Reality：

```bash
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## 三、本机防火墙和云防火墙不是一回事

本机规则放行后，还要验证外部包是否真的能到 VPS。

TCP 可以从本地做 socket 探测：

```powershell
$client = [System.Net.Sockets.TcpClient]::new()
$client.Connect("VPS_IP", 443)
```

UDP 则更适合在 VPS 上抓包：

```bash
sudo tcpdump -ni any udp port 54321
```

如果本地发送 UDP 探测包，但 VPS 上 `tcpdump` 抓不到任何包，说明问题已经不在 sing-box，也不在服务器本机 iptables，而是在云厂商外层网络规则。

Oracle Cloud 至少要检查：

```text
VCN Security List
Network Security Group
实例所在子网的入站规则
```

HY2 需要 UDP 入站规则。只开 TCP 是没用的，UDP 包不会因为你态度诚恳就自己变成 TCP。

---

## 四、添加 VLESS Reality 主节点

使用 233boy 的 sing-box 脚本可以直接添加 VLESS Reality：

```bash
sudo sing-box add vless-reality 443
sudo sing-box restart
```

然后确认端口：

```bash
sudo ss -lntup | grep ':443'
```

导出的客户端链接里会包含 UUID、Reality public key、SNI 等敏感信息。公开文章里不贴完整链接，只记录字段结构：

```text
protocol: vless
security: reality
network: tcp
flow: xtls-rprx-vision
port: 443
sni: www.cloudflare.com 或其他握手域名
public key: 客户端使用
private key: 仅服务端保存
```

Reality 的关键是服务端和客户端参数必须一致。服务端写 private key，客户端写 public key。这个点错一次，排障半小时，很公平。

---

## 五、部署 Docker 备用 sing-box

原生 sing-box 跑主节点，Docker 版作为备用节点。官方镜像是：

```text
ghcr.io/sagernet/sing-box
```

目录结构：

```text
/opt/sing-box-docker
├── config.json
├── docker-compose.yml
└── certs/
```

Compose 结构大致如下：

```yaml
services:
  sing-box-docker:
    image: ghcr.io/sagernet/sing-box:latest
    container_name: sing-box-docker
    restart: unless-stopped
    network_mode: host
    volumes:
      - /opt/sing-box-docker:/etc/sing-box:ro
    command: ["-D", "/var/lib/sing-box", "-C", "/etc/sing-box", "run"]
```

备用端口：

```text
TCP 8443 -> VLESS Reality
UDP 8444 -> Hysteria2
```

本机防火墙同步放行：

```bash
sudo iptables -I INPUT 7 -p tcp --dport 8443 -j ACCEPT
sudo iptables -I INPUT 8 -p udp --dport 8444 -j ACCEPT
sudo netfilter-persistent save
```

验证：

```bash
sudo docker ps --filter name=sing-box-docker
sudo ss -lntup | grep -E '(:443|:54321|:8443|:8444)'
```

---

## 六、安装 Beszel 监控面板

Beszel 的结构分两部分：

```text
Hub   -> 面板和数据库
Agent -> 每台机器上的采集器
```

Hub 用 Docker 部署：

```yaml
services:
  beszel:
    image: henrygd/beszel:latest
    container_name: beszel
    restart: unless-stopped
    environment:
      APP_URL: http://VPS_IP:8090
    ports:
      - 8090:8090
    volumes:
      - ./beszel_data:/beszel_data
      - ./beszel_socket:/beszel_socket
```

启动：

```bash
cd /opt/beszel
sudo docker compose up -d
```

放行面板端口：

```bash
sudo iptables -I INPUT 9 -p tcp --dport 8090 -j ACCEPT
sudo netfilter-persistent save
```

验证：

```bash
sudo docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' beszel
sudo ss -lntup | grep ':8090'
```

---

## 七、为什么 Beszel 系统会显示红色

Beszel 里添加系统后，如果看到红点，通常不是面板坏了，而是 Agent 没连上。

常见原因：

```text
1. 目标 VPS 没有安装 beszel-agent
2. Agent 公钥用错，尤其是从 UI 里复制到了截断版本
3. token 用错：系统 token 和通用 token 混用
4. Hub 无法访问 Agent 的 45876 端口
5. 使用 WebSocket 自注册时 HUB_URL 配错
```

我这次采用的是 WebSocket 方式，让 Agent 主动连 Hub：

```bash
/agent \
  -listen 45876 \
  -key "HUB_PUBLIC_KEY" \
  -token "SYSTEM_OR_UNIVERSAL_TOKEN" \
  -url "http://HUB_URL:8090"
```

如果是 Hub 和 Agent 在同一台机器上，`-url` 可以直接用：

```text
http://127.0.0.1:8090
```

Agent 日志里出现：

```text
WebSocket connected
```

面板状态才会从 `down` 变成 `up`。

---

## 八、添加其他 VPS

添加其他 VPS 时推荐使用通用令牌，让 Agent 自动注册：

```text
1. Beszel Hub 中启用通用令牌
2. 在目标 VPS 安装 Docker
3. 运行 beszel-agent
4. Agent 使用 HUB_URL 主动连接 Hub
5. 回到面板修改系统名称
```

这样不需要给每台 VPS 开放 Agent 入站端口，结构更干净。

不过前提是：你能 SSH 登录目标 VPS。没有登录权限，就谈不上安装 Agent。监控系统再优秀，也不会隔空往别人服务器里长出来。

---

## 九、安全建议

这类面板和节点服务不要长期裸奔。

最低限度：

```text
1. Beszel 管理员密码必须足够强
2. 不要公开完整代理链接、UUID、token、私钥
3. Cloud 安全组只开放必要端口
4. SSH 优先使用 key，不要长期保留弱密码
5. 管理面板最好放到 Tailscale / WireGuard / Cloudflare Tunnel 后面
```

如果只是短期调试，公网 `8090` 可以接受。长期运行的话，建议放到私有网络或 HTTPS 反代后面。否则面板迟早会被扫到，互联网从不缺闲得发慌的扫描器。

---

## 十、最终结构

最终结构可以概括为：

```text
Oracle VPS:
  443/tcp   -> VLESS Reality
  54321/udp -> Hysteria2
  8443/tcp  -> Docker VLESS Reality backup
  8444/udp  -> Docker Hysteria2 backup
  8090/tcp  -> Beszel Hub
  45876/tcp -> Beszel Agent

Monitoring:
  Beszel Hub
    <- WebSocket / Agent data
  Beszel Agent
    -> CPU / memory / disk / network / Docker status
```

---

## 总结

这次部署最大的收获不是“哪个协议更快”，而是把运维边界拆清楚：

- 服务监听不等于外部可达。
- 本机防火墙和云厂商安全组是两层东西。
- TCP 通不代表 UDP 通。
- Docker 适合做备用和隔离，但端口规划要清楚。
- Beszel 红点多数是 Agent 没连上，不是 Hub 页面坏了。
- 通用令牌适合新机器自注册，已有系统更适合用系统 token 绑定。

这类问题的解法不是盲目重装，而是沿着链路一层层验证：

```text
进程是否运行
端口是否监听
本机防火墙是否放行
云防火墙是否放行
客户端参数是否一致
日志是否显示连接成功
```

照这个顺序排，很多看似复杂的问题都会老实下来。服务器不会撒谎，最多就是报错报得很没礼貌。
