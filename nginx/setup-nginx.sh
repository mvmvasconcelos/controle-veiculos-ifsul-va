#!/bin/bash

# Script para configurar o Nginx do projeto Controle de Veículos

NOME_DO_PROJETO="controle-veiculos"
ARQUIVO_CONF="${NOME_DO_PROJETO}.conf"

if [ "$EUID" -ne 0 ]; then
  echo "Este script precisa ser executado como root (use sudo)"
  exit 1
fi

echo "Configurando Nginx para o projeto ${NOME_DO_PROJETO}..."

CONFIGS_DIR="/home/ifsul/docs/configs"
NGINX_APPS_DIR="/etc/nginx/conf.d/apps"

mkdir -p "$CONFIGS_DIR"
mkdir -p "$NGINX_APPS_DIR"

# Backup se já existir
if [ -f "$NGINX_APPS_DIR/$ARQUIVO_CONF" ]; then
  TIMESTAMP=$(date +%Y%m%d%H%M%S)
  cp "$NGINX_APPS_DIR/$ARQUIVO_CONF" "$NGINX_APPS_DIR/${ARQUIVO_CONF}.bak.${TIMESTAMP}"
fi

echo "Copiando ${ARQUIVO_CONF} para $CONFIGS_DIR..."
cp ${ARQUIVO_CONF} "$CONFIGS_DIR/"

echo "Copiando ${ARQUIVO_CONF} para $NGINX_APPS_DIR..."
cp ${ARQUIVO_CONF} "$NGINX_APPS_DIR/"

echo "Verificando a configuração do Nginx..."
nginx -t

if [ $? -eq 0 ]; then
  echo "Reiniciando o serviço Nginx..."
  systemctl reload nginx
  echo "Configuração do Nginx concluída com sucesso!"
else
  echo "Erro na configuração do Nginx."
  exit 1
fi
