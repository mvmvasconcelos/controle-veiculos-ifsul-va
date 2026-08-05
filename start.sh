#!/bin/bash
# Script de inicialização do Controle de Veículos IFSul - Venâncio Aires

echo "=== Iniciando Controle de Veículos IFSul Venâncio Aires ==="

# Subir containers via Docker Compose
docker-compose up -d --build

echo "Aguardando serviço iniciar..."
sleep 3

# Executar seed no container
docker-compose exec -T app python seed.py

echo "=== Aplicação iniciada com sucesso! ==="
echo "Local: http://localhost:8096"
echo "Produção: https://ifva.duckdns.org/controle-veiculos/"
