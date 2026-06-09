# About

「Sanshin Edge Vision」フロントエンド。AWS SAM を用いて Lambda（コンテナイメージ）としてデプロイします。

## 必要なツール

OS は問いません（Mac / Windows / Linux）。以下を事前に用意してください。

- Node.js 20
- Docker（起動中の Docker エンジン）
  - Mac: Docker Desktop または colima
  - Windows: Docker Desktop（WSL2 バックエンド）
- AWS CLI（`aws configure` 等で認証情報を設定済みであること）
- AWS SAM CLI

## デプロイ手順（OS 共通）

Docker を起動した状態で、以下を実行します。

```bash
npm install
sam build
sam deploy --config-env dev --resolve-image-repos
sam deploy --config-env dev-alfa --resolve-image-repos
```

## ビルドに関する注意

Lambda のターゲットアーキテクチャは x86_64 です。

- **x86_64 ホスト（Windows / 一般的な Linux / Intel Mac）**: そのままビルドできます。
- **x86_64 以外のホスト（Apple Silicon Mac など）**: QEMU エミュレーションでビルドされるため、メモリ不足でビルドが失敗（Segmentation fault / SIGKILL 等）する場合があります。Docker に割り当てるメモリを 8GB 以上に増やし、必要に応じてキャッシュを使わずに再ビルドしてください。

```bash
# ビルドが失敗する場合（Docker のメモリを増やしたうえで）
sam build --no-cached
```

> 注: 本手順は Windows 上での動作検証は行っていません。コマンド自体は OS 非依存ですが、環境によって調整が必要な場合があります。

## 初回テナント管理者登録

- 例(bash / curl)

```bash
curl -X POST https://k64l2ssaj3.execute-api.ap-northeast-1.amazonaws.com/dev/api/admin/v1/tenants/test-tenant-002-dev-blue-swagger/users \
  -H "x-api-key: sM2TijRJJM4ofENmJzEzd3itfGMTiKtp8KYF6TSp" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test-tenant-002-dev-blue-swagger",
    "name": "Taro Yamada",
    "email": "taro.yamada@example.com",
    "role_id": 1,
    "receive_alerts": true
  }'
```

## 初回スーパー管理者登録

- 例(bash / curl)

```bash
curl -X POST https://k64l2ssaj3.execute-api.ap-northeast-1.amazonaws.com/dev/api/admin/v1/tenants/test-tenant-002-dev-blue-swagger/users \
  -H "x-api-key: sM2TijRJJM4ofENmJzEzd3itfGMTiKtp8KYF6TSp" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test-tenant-002-dev-blue-swagger",
    "name": "Taro Yamada",
    "email": "taro.yamada@example.com",
    "role_id": 1,
    "receive_alerts": true,
    "is_super_admin": true
  }'
```

- 例(PowerShell)

```pwsh
$headers = @{
    "x-api-key" = "sM2TijRJJM4ofENmJzEzd3itfGMTiKtp8KYF6TSp"
    "Content-Type" = "application/json"
}

$body = @{
    tenant_id = "test-tenant-002-dev-blue-swagger"
    name = "Taro Yamada"
    email = "taro.yamada@example.com"
    role_id = 1
    receive_alerts = $true
    is_super_admin = $true
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "https://k64l2ssaj3.execute-api.ap-northeast-1.amazonaws.com/dev/api/admin/v1/tenants/test-tenant-002-dev-blue-swagger/users" -Method Post -Headers $headers -Body $body

Write-Host "Status Code: $($response.StatusCode)"
Write-Host "Response: $($response.Content)"
```
