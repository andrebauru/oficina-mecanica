#!/usr/bin/env bash
set -u

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="diagnostico-servidor-${TIMESTAMP}.txt"

exec > >(tee "$OUT_FILE") 2>&1

echo "Arquivo de saída: $OUT_FILE"
echo "Data: $(date '+%Y-%m-%d %H:%M:%S')"
echo

echo "===== 1) PORTAS 3001/3002 ====="
sudo ss -ltnp '( sport = :3001 or sport = :3002 )' || true
echo

for PORT in 3001 3002; do
  PID="$(sudo ss -ltnp "sport = :$PORT" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n1)"
  if [ -n "${PID:-}" ]; then
    echo "---- PORTA $PORT / PID $PID ----"
    echo "EXE:     $(sudo readlink -f /proc/$PID/exe 2>/dev/null || true)"
    echo "CWD:     $(sudo readlink -f /proc/$PID/cwd 2>/dev/null || true)"
    echo -n "CMDLINE: "
    sudo tr '\0' ' ' < "/proc/$PID/cmdline" 2>/dev/null || true
    echo
    echo
  fi
done

echo "===== 2) NGINX / SITES-ENABLED ====="
sudo ls -lah /etc/nginx/sites-enabled/ || true
echo
for f in /etc/nginx/sites-enabled/*; do
  [ -f "$f" ] || continue
  echo "---- ARQUIVO: $f ----"
  sudo awk '
    /server_name|listen|location \/api|location \/|proxy_pass|include|root/ { print NR ": " $0 }
  ' "$f"
  echo
done

echo "===== 3) PM2 ====="
pm2 ls || true
echo
pm2 prettylist 2>/dev/null | node -e '
let s="";
process.stdin.on("data", d => s += d).on("end", () => {
  try {
    const arr = JSON.parse(s);
    arr.forEach(p => {
      console.log("NAME:", p.name);
      console.log("PID:", p.pid);
      console.log("STATUS:", p.pm2_env && p.pm2_env.status);
      console.log("SCRIPT:", p.pm2_env && p.pm2_env.pm_exec_path);
      console.log("CWD:", p.pm2_env && p.pm2_env.pm_cwd);
      console.log("ARGS:", p.pm2_env && p.pm2_env.args);
      console.log("---");
    });
  } catch (e) {
    console.error("Falha ao ler PM2 JSON:", e.message);
  }
});
' || true
echo
pm2 show all || true
echo

echo "===== 4) BUSCA POR 'Coleção não encontrada' ====="
sudo grep -RIn --binary-files=without-match "Coleção não encontrada" /var/www/hiratacars.jp/ 2>/dev/null || true
echo

echo "===== 5) SYSTEMD E PROCESSOS NODE ====="
systemctl list-units --type=service --all | grep -Ei 'nginx|pm2|node|oficina|hirata' || true
echo
ps -ef | grep -Ei 'node|pm2|backend|backend2|server.js' | grep -v grep || true
echo

echo "===== 6) NGINX CONFIG COMPLETA (opcional para análise fina) ====="
sudo nginx -T 2>/dev/null || true
echo

echo "Diagnóstico concluído. Resultado salvo em: $OUT_FILE"
