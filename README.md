# SIGA Feira

Sistema Inteligente de Gestão da Acessibilidade para mapear barreiras urbanas em Feira de Santana, Bahia.

O SIGA permite que moradores consultem ocorrências em um mapa colaborativo e registrem problemas como calçadas danificadas, falta de rampas, obstáculos na via e semáforos sem recursos acessíveis. O projeto foi desenvolvido como uma proposta escolar de participação cidadã, transparência e apoio ao planejamento urbano.

## Funcionalidades

- mapa interativo de Feira de Santana com dados do OpenStreetMap;
- consulta pública de ocorrências e detalhes de cada relato;
- cadastro e acesso com e-mail e senha ou conta Google;
- registro de barreiras com localização, descrição e foto;
- localização pelo dispositivo ou seleção direta no mapa;
- armazenamento persistente dos relatos em PostgreSQL;
- processamento das fotos em WebP;
- verificação local de imagens com NSFWJS;
- remoção de uma ocorrência somente pelo seu autor;
- materiais educativos sobre acessibilidade urbana;
- interface responsiva e preparada para navegação por teclado.

## Arquitetura

| Componente | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Interface | React, Vite e Leaflet | Exibe o site, o mapa e os formulários |
| Autenticação | Firebase Authentication | Identifica os usuários |
| API | Node.js e Express | Valida acessos e processa ocorrências |
| Banco de dados | PostgreSQL | Armazena os relatos |
| Fotos | Sharp, NSFWJS e volume Docker | Normaliza, verifica e preserva imagens |
| Publicação | Docker Compose e Nginx | Executa os serviços na VPS |

O navegador nunca acessa o PostgreSQL diretamente. A API valida o token do Firebase antes de criar ou remover relatos. A consulta do mapa é pública.

## Requisitos

- Docker com o plugin Docker Compose; ou
- Node.js 22 ou superior para desenvolvimento do front-end.

## Configuração

Crie o arquivo `.env` a partir do modelo:

```sh
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Preencha as variáveis do aplicativo Web no projeto Firebase e defina uma senha forte para o PostgreSQL:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=siga-be825.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=siga-be825
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=/api
POSTGRES_PASSWORD=troque-esta-senha
```

O arquivo `.env` contém dados de configuração do ambiente e não é enviado ao GitHub.

No Firebase Authentication, habilite os provedores **E-mail/senha** e **Google**. Adicione também o domínio público da aplicação em **Authorized domains**.

## Executar com Docker

Na raiz do projeto:

```sh
docker compose up -d --build
```

Acesse `http://localhost:8081`. O Compose inicia o site, a API e o PostgreSQL. A porta do banco não é publicada no host.

Para parar os contêineres sem apagar os dados:

```sh
docker compose down
```

Os relatos e as fotos permanecem nos volumes `siga-postgres-data` e `siga-photo-data`.

## Desenvolvimento local

```sh
npm install
npm run dev
```

O Vite abre a interface em `http://localhost:5173` e encaminha as chamadas de `/api` para a API local.

Comandos disponíveis:

```sh
npm run dev
npm run build
npm run lint
npm run preview
```

## Publicação na VPS

Copie os arquivos do projeto para o servidor, preserve o `.env` de produção e execute:

```sh
docker compose up -d --build
```

O site fica disponível na porta `8081`. Em produção, configure HTTPS em um proxy reverso e autorize o domínio no Firebase Authentication.

### Domínio oficial

O domínio configurado para a publicação é `sigafeira.online`, com `www.sigafeira.online` como endereço alternativo. Os modelos do proxy reverso ficam em `deploy/nginx`:

- `sigafeira.online.bootstrap.conf`: HTTP e desafio ACME antes da emissão do certificado;
- `sigafeira.online.conf`: redirecionamento para HTTPS e proxy definitivo.

Os dois nomes precisam apontar para o IP público da VPS. Depois da propagação do DNS, emita o certificado Let's Encrypt e adicione `sigafeira.online` aos domínios autorizados do Firebase Authentication.

## Dados e privacidade

As ocorrências publicadas ficam visíveis no mapa. Fotos aceitas são convertidas para WebP e armazenadas no volume da aplicação. O classificador de imagens funciona na própria API, sem contratar um serviço externo de moderação. Como classificadores automáticos podem errar, a moderação humana continua recomendada em uma implantação pública.

## Materiais educativos

As dez cartilhas públicas ficam em `public/materiais` e podem ser acessadas diretamente pela seção **Materiais educativos** do site. O resumo expandido foi retirado da biblioteca pública e preservado somente como documentação do projeto em `docs/pesquisa`.

## Organização do projeto

```text
Siga/
├── api/                  # API Node.js e processamento de fotos
├── deploy/nginx/         # Configurações do domínio e HTTPS
├── docs/pesquisa/        # Documentação acadêmica não publicada no site
├── public/
│   ├── assets/           # Logotipo, ícones e imagens públicas
│   └── materiais/        # Dez cartilhas oferecidas no site
├── src/                  # Componentes React, integrações e estilos
├── docker-compose.yml    # Site, API e PostgreSQL
├── Dockerfile            # Build do front-end e Nginx da aplicação
└── README.md
```

## Autor

Criado por **Angelo** — [@AngeLZinS2](https://github.com/AngeLZinS2).

Projeto escolar desenvolvido em Feira de Santana, Bahia.
