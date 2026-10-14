# Pesquisa: hub de mensageiros com cliente IRC embutido

Feita em 13/10/2026. Estrelas, versões e commits consultados nesse dia pela
API do GitHub, do Codeberg e do npm. Tudo marcado como **testado** foi rodado
nesta máquina: Windows 10 Pro 19045, MSI MS-7A15, 4 threads, 16 GB, Intel HD
Graphics 630, tela 1024x768.

## Requisitos

- Roda **local no Windows**. Nada de VPS, EasyPanel, bouncer ou gateway de
  terceiro.
- Hub **popular**, com muitas estrelas no GitHub e projeto vivo.
- **Pouco consumo de CPU e RAM.**
- Cliente IRC **forte em IRCv3**.
- Serviços: WhatsApp, Telegram, Discord, Gmail, Hotmail, YouTube, um
  navegador livre e IRC.
- Servidor IRC de referência: `irc.rodslater.com:6697` (TLS), canais
  `#sergipe` e `#brasil`.

## Decisão

**Fork do Ferdium + Halloy encaixado dentro da janela do Ferdium.**

O Ferdium cuida dos serviços web. O Halloy roda como processo próprio e a
janela dele é encaixada (Win32 `SetParent`) na área de conteúdo do Ferdium
quando o ícone de IRC é selecionado. Para o usuário, é uma aba do hub.

Por que:

1. **IRCv3:** o Halloy é, de longe, o cliente de desktop mais completo, e é o
   único dos candidatos que usa o que o RodsChat oferece além do básico
   (`draft/chathistory` e `draft/multiline`). Testado: ver "Testes".
2. **Consumo:** 87 MB e 1 processo, contra ~146 MB (The Lounge) e ~79 MB
   (Kiwi) de custo adicional dentro do Electron. CPU parado desprezível nos
   três.
3. **Popularidade e atividade:** 4.546 estrelas; 530 commits nos últimos 90
   dias.
4. **Hub:** o Ferdium segue a escolha certa. Com sessões isoladas, o motor
   dele gastou menos RAM e menos CPU que o WebView2 do Tauri (ver "Medição
   do hub").

**Encaixe validado (testado):** desenho, mouse, clique em canal, digitação,
acentos, Ctrl+A, Ctrl+C e Ctrl+V funcionam com o Halloy dentro da janela
Electron. Duas condições: o hub mantém o Halloy no topo da ordem z e passa o
foco de teclado a ele explicitamente (ver "Testes", item 5). Ainda não
testado: acento digitado com tecla morta do ABNT2 (´ seguido de e) por um
teclado físico.

**Plano B, se o encaixe falhar:** Ferdium + The Lounge embutido (detalhes em
"Plano B"). Perde `chathistory` e `multiline`.

## Hubs (estrelas em 13/10/2026)

| Projeto | Estrelas | Situação | Licença |
|---|---|---|---|
| Rambox CE | 6.379 | Arquivado desde 2022 (o Rambox fechou o código) | GPL-3.0 |
| Franz | 4.725 | Repositório aberto parado; o app virou comercial | Apache-2.0 |
| **Ferdium** | **4.684** | **Ativo.** 7.2.3 estável em 07/09/2026; nightly já em Electron 44.2.0 | Apache-2.0 |
| Station | 1.683 | Pouco usado | Apache-2.0 |
| Wavebox | 1.377 | Navegador comercial, não é base aproveitável | sem licença |
| Hamsket | 863 | Arquivado em 2024 | GPL-3.0 |

Ferdium em detalhe (branch `develop`): Electron 44.2.0, React 18.3.1,
MobX 6, TypeScript, `sqlite3` 5.1.6, `packageManager: pnpm@12.3.4`, Node
24.20.0 nos `engines`. 441 recipes no repositório `ferdium-recipes` (MIT).
Recursos já prontos em `src/features`: workspaces, todos, quickSwitch,
serviceProxy, webControls (voltar, avançar, barra de endereço), basicAuth.
Os serviços são tags `<webview>` com partição própria.

### Recipes para os serviços pedidos

| Serviço | Recipe |
|---|---|
| WhatsApp | `whatsapp` |
| Telegram | `telegram` |
| Discord | `discord` |
| Gmail | `gmail` |
| Hotmail | `office365-owa` (tem aliases `live.com` e `outlook` e aceita URL própria) |
| YouTube | `youtube` |
| Navegador | `franz-custom-website` + `webControls` |
| IRC | Halloy encaixado (não é recipe). No plano B, `thelounge` |

### Hubs leves (Tauri / WebView2), descartados

| Projeto | Estrelas | Observação |
|---|---|---|
| Akkitto/Tauridium | 2 | MIT, modo local sem conta, recipes, hibernação. Criado em ago/2026 |
| Gizmo091/Tauridium | 9 | MIT, mas exige conta num servidor Ferdium |
| BZcreativ/bzdium | 1 | Sem licença definida (não dá para fazer fork). Criado em 09/10/2026 |

Descartados por popularidade e, depois da medição, também por consumo. O
"~30 MB" que o bzdium anuncia conta só o processo do app (3 a 4 MB medidos
aqui); os sites rodam em processos `msedgewebview2.exe` separados. A
vantagem real do Tauri é o instalador: 3,9 MB contra 129 MB do Ferdium.

## Clientes IRC

### Popularidade e atividade (13/10/2026)

| Projeto | Estrelas | Contribuidores | Commits 90 dias | Commits 12 meses | Última versão | Licença |
|---|---|---|---|---|---|---|
| **Halloy** | 4.546 | 103 | **530** | **2.825** | 2026.9 (01/10/2026) | GPL-3.0 |
| The Lounge | 6.354 | 174 | 25 | 120 | 4.5.2 (07/2026) | MIT |
| Kiwi IRC | 990 | 37 | **0** | **8** | 1.7.1 (**09/2023**) | Apache-2.0 |
| gamja | 103 (Codeberg) | | | | atualizado 09/2026 | AGPL-3.0 |

Outros: WeeChat (3.404, terminal), HexChat (3.226, arquivado em 2024), KVIrc
(307), Convos (1.196). mIRC é pago; AdiIRC é gratuito de código fechado.

Kiwi: interface em Vue 2.7, sem suporte desde dez/2023. Precisa de um
gateway WebSocket (o pacote `kiwiirc-server` para Windows já traz o
webircgateway em Go, 9 MB). Guarda no navegador as redes, os canais, as
configurações e só as últimas mensagens de cada canal (`latest_messages`);
não tem histórico completo.

gamja: cliente web do autor do bouncer soju, forte em IRCv3 (chathistory,
read-marker, message-redaction, bouncer-networks). Precisa de servidor
WebSocket; para a Libera ou o RodsChat seria um soju local. Pouco popular e
AGPL.

### IRCv3

Fontes: tabela de [ircv3.net/software/clients](https://ircv3.net/software/clients)
e README atual do Halloy.

| Recurso | Halloy | The Lounge | Kiwi | gamja |
|---|---|---|---|---|
| Básicos (server-time, echo-message, SASL, account-tag, chghost, batch) | ✓ | ✓ | ✓ | ✓ |
| labeled-response, MONITOR | ✓ | ✗ | ✓ | ✓ |
| msgid | ✓ | 4.5.0+ | ✓ | ✓ |
| **chathistory** | ✓ | ✗ | ✗ | ✓ |
| **multiline** | ✓ | ✗ | ✗ | ✗ |
| read-marker | ✓ | ✗ | ✗ | ✓ |
| typing | ✓ | ✗ | ✗ | ✓ |
| reply / react / message-redaction | ✓ | ✗ | só reply | só redaction |
| metadata (avatar, nome de exibição) | ✓ | ✗ | ✗ | ✗ |
| bouncer-networks do soju | ✓ | ✗ | ✗ | ✓ |

### O que o RodsChat oferece (testado)

`irc.rodslater.com` roda **UnrealIRCd 6.2.6**, rede **RodsChat**. CAPs
oferecidas: away-notify, invite-notify, extended-join, userhost-in-names,
multi-prefix, cap-notify, sasl, setname, tls, chghost, account-notify,
message-tags, batch, server-time, account-tag, echo-message,
labeled-response, **draft/chathistory** (`CHATHISTORY=50`), extended-monitor,
standard-replies, no-implicit-names, draft/extended-isupport,
**draft/multiline**, mais as `unrealircd.org/*`. Não oferece read-marker nem
metadata.

CAPs que o Halloy 2026.9 negociou de fato (log dele): invite-notify,
userhost-in-names, away-notify, message-tags, server-time, chghost,
extended-monitor, account-notify, extended-join, batch, **draft/chathistory**,
labeled-response, echo-message, multi-prefix, setname, sasl,
**draft/multiline**, no-implicit-names.

## Testes feitos nesta máquina

1. **`node:sqlite` no Electron 44.2.0 (Node 24.20.0, Chromium 152):
   funciona.** O The Lounge usa esse SQLite embutido, então não há módulo
   nativo para recompilar.
2. **The Lounge 4.5.2** sobe com o Node 22 e com o Node do Electron. Conectou
   no RodsChat e gravou log de `#sergipe` e `#brasil`. Visto em print: MOTD do
   RodsChat e os dois canais.
3. **Kiwi 1.7.1** (`kiwiirc-server` para Windows): conectou no RodsChat com
   `autoConnect`, já em português. Visto em print: `#sergipe` com 7 usuários.
4. **Halloy 2026.9**, compilado do código-fonte (`cargo build --release`,
   executável de 56 MB) e rodando em modo portátil (`HALLOY_PORTABLE_DIR`):
   conectou no RodsChat, entrou nos dois canais e negociou chathistory e
   multiline. Ao abrir `#sergipe` mostrou "No Older Chat History Messages
   Available", ou seja, consultou o histórico do servidor.
5. **Halloy encaixado numa janela Electron** (`SetParent`, tirando título e
   borda, `WS_CHILD`):
   - desenho: ✓, aparece na área de conteúdo, ao lado da barra lateral;
   - mouse: ✓, mas só depois de subir o Halloy na ordem z
     (`SetWindowPos(HWND_TOP)`). Antes disso, o `Chrome_RenderWidgetHostHWND`
     do Electron ficava por cima e recebia os cliques;
   - teclado: ✓, **com foco explícito.** Só clicar no campo não basta: o
     foco de teclado do Windows continua na janela do Electron e as letras
     se perdem. Com `AttachThreadInput` + `SetFocus(halloy)`, digitação,
     acentos (ação, é, ã, ç), Ctrl+A, Ctrl+C (conferido na área de
     transferência) e Ctrl+V funcionaram dentro do encaixe;
   - armadilha do teste: o `SendKeys` do .NET manda tecla sem scancode, e o
     winit (usado pelo Halloy) descarta essas teclas, até com o Halloy
     solto. Para simular teclado, usar `SendInput` com scancode
     (`scripts/teclar.ps1` da sessão);
   - redimensionar: ✗ sozinho. Quando a janela do host mudou de tamanho, o
     Halloy ficou do tamanho antigo. O hub precisa reposicionar o filho a
     cada `resize`.

### Armadilha do Halloy no Windows

Com o backend Vulkan (padrão nesta máquina), a captura de tela (`PrintWindow`
e `CopyFromScreen`) mostra a janela toda branca, embora ele esteja
funcionando. Com `WGPU_BACKEND=dx12`, a captura sai certa. Para o encaixe,
preferir DX12, que passa pelo compositor do Windows.

## Medição de consumo

Método: abrir, esperar 45 s, somar RAM privada de toda a árvore de processos
e medir CPU gasta na janela seguinte. Toda medição foi conferida com print da
tela antes de valer.

**Correção:** a primeira rodada do hub usou `WebContentsView` no Electron, e
esse componente não estava sendo desenhado no meu harness (página em branco).
Refeito com a tag `<webview>`, que é o que o Ferdium usa. Os números abaixo
substituem os anteriores.

### Clientes IRC no RodsChat (`#sergipe` e `#brasil`, janela de 120 s)

| Cliente | RAM privada total | Processos | CPU parado |
|---|---|---|---|
| **Halloy nativo (DX12)** | **87 MB** | **1** | 0,04 % |
| The Lounge (servidor + página no Electron) | 294 MB | 7 | 0,03 % |
| Kiwi (gateway + página no Electron) | 227 MB | 7 | 0,03 % |
| Base: Electron vazio, mesmo harness | 148 MB | 5 | 0,01 % |

Custo adicional dentro de um Ferdium que já está aberto (total menos a
base): **Halloy ~87 MB** (processo próprio, nada no Electron), **The Lounge
~146 MB**, **Kiwi ~79 MB**. CPU parado é desprezível nos três; o que pesa é
o tráfego dos canais, baixo no RodsChat.

### Hub: 4 sites (YouTube, WhatsApp, Discord, Telegram), sessões isoladas, janela de 60 s

| Variante | RAM privada | CPU parado | Processos |
|---|---|---|---|
| **Electron 44 `<webview>`** (2 rodadas) | **702 / 695 MB** | **0,31 / 0,27 %** | 10 |
| WebView2, uma pasta por serviço (3 rodadas) | 981 / 948 / 988 MB | 1,04 / 1,24 / 1,32 % | 29 |
| WebView2, sessões compartilhadas (sem isolamento) | 743 / 696 MB | 1,07 / 0,91 % | 13 |
| **Electron `<webview>`, 3 dos 4 hibernados** | **319 MB** | 0,42 % | 6 |

- Com isolamento, o Electron gastou ~30 % menos RAM e cerca de 1/4 da CPU do
  WebView2. O Electron isola por partição dentro de um navegador só; o
  WebView2 sobe um navegador inteiro por pasta.
- Hibernar corta a RAM pela metade.
- Não medido: a interface React do próprio Ferdium por cima do Electron.

## Plano B: Ferdium + The Lounge

Se o Halloy encaixado não funcionar bem com teclado, foco e
redimensionamento, o caminho é o The Lounge embutido: o Ferdium o inicia com
o Node do Electron, escutando em `127.0.0.1`, e o IRC usa a recipe
`thelounge`. O padrão já existe no Ferdium (`src/internal-server`, AdonisJS).
Custa ~146 MB e perde chathistory e multiline.

Armadilhas já resolvidas:

- **Escuta em `[::]:9000` por padrão**, aberto para a rede local. Precisa de
  `host: "127.0.0.1"` no `config.js`.
- **Instalar com pnpm falha**: depende de
  `github:kiwiirc/irc-framework#9578e59` (hash curto). No
  `pnpm-workspace.yaml`:
  ```yaml
  overrides:
    irc-framework: github:kiwiirc/irc-framework#9578e59a1056499e4a03a0f0fd2c260e9aadc541
  blockExoticSubdeps: false
  allowBuilds:
    irc-framework@https://codeload.github.com/kiwiirc/irc-framework/tar.gz/9578e59a1056499e4a03a0f0fd2c260e9aadc541: true
  ```
  A 4.6.0-pre.1 aponta para outro commit (`69d47d1`).
- **O pnpm 12 bloqueia o script de instalação do Electron**: rodar
  `node node_modules/electron/install.js` ou liberar em `allowBuilds`.
- O aviso "vapid.json is world readable" é checagem estilo Unix; não se
  aplica ao Windows.

## O que o encaixe do Halloy exige no fork

- Iniciar o Halloy em modo portátil, com pasta de dados dentro da pasta do
  Ferdium, e `WGPU_BACKEND=dx12`.
- Encaixar com `SetParent`, estilo `WS_CHILD`, e manter o Halloy no topo da
  ordem z (acima do `Chrome_RenderWidgetHostHWND`).
- Reposicionar a cada `resize` e mudança de DPI; mostrar e esconder ao
  trocar de serviço.
- Dar o foco de teclado ao Halloy (`AttachThreadInput` + `SetFocus`) quando
  a aba de IRC for selecionada e quando o usuário clicar dentro dela.
  Testado: sem isso, as teclas não chegam.
- Contador de não lidas na barra lateral: o Halloy não expõe isso para
  outro programa. Precisa de um patch pequeno no Halloy (GPL-3.0), por
  exemplo gravar o número num arquivo ou no canal `ipc` que ele já tem.
- Licença: o Halloy roda como programa separado, então o fork do Ferdium
  continua Apache-2.0. Distribuir o executável do Halloy junto obriga a
  oferecer o código-fonte dele (GPL).
- Risco conhecido de `SetParent` entre processos: as filas de entrada dos
  dois ficam ligadas, então se um travar, o outro pode congelar junto.

## Estado do fork (13/10/2026)

Código neste repositório (Ferdium v7.2.3, Electron 43.3.0). A integração fica em
`src/features/halloy/`, mais um desvio em
`src/components/services/content/ServiceView.tsx` e uma linha em
`src/electron/ipc-api/index.ts`.

Como funciona:

- Ao iniciar, o Ferdium grava a recipe "IRC (Halloy)" em
  `userData/recipes/dev/halloy-irc`. Ela aparece em Adicionar serviço →
  Custom Services.
- O serviço de IRC não tem webview: o componente `HalloyView` reserva a área
  e avisa o processo principal quando mostrar ou esconder. O Halloy só é
  iniciado na primeira vez que a aba de IRC fica visível.
- O Halloy roda em modo portátil, com dados em `userData/halloy` e
  configuração inicial apontando para o RodsChat (`#sergipe`, `#brasil`),
  apelido igual ao usuário do Windows e três apelidos alternativos.
- Chamadas ao Windows via `koffi` 3.3.3.

Testado no app, com print e pelo protocolo de depuração:

- adicionar o serviço pela interface; o Halloy inicia, encaixa e conecta;
- clicar em canal, digitar com acentos, foco de teclado automático;
- esconder em Configurações, Ctrl+K e menu da barra de título; voltar ao
  fechar cada um;
- trocar para outro serviço (site) e voltar;
- maximizar: o Halloy acompanha;
- File → Quit encerra o Halloy junto;
- consumo parado com o IRC aberto: Ferdium 263 MB em 4 processos, Halloy
  98 MB, CPU 0,03 %.

Não testado: tecla morta do ABNT2 com teclado físico, mudança de DPI
(monitor com escala diferente de 100 %), versão empacotada pelo
electron-builder.

### Como compilar e rodar

```bash
# a partir da raiz deste repositório
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*'
fnm exec --using=24.18.1 npx.cmd -y pnpm@11.20.0 install   # ~26 min no exFAT
fnm exec --using=24.18.1 node node_modules/electron/install.js
# catálogo de recipes (precisa de targz@1.0.1 e image-size@1.0.2 no NODE_PATH)
cd recipes && fnm exec --using=24.18.1 node scripts/package.js && cd ..
fnm exec --using=24.18.1 node esbuild.mjs
# halloy.exe compilado do Halloy 2026.9 em ferdium/halloy-bin/
ELECTRON_IS_DEV=0 APPDATA="<pasta de perfil>" node_modules/electron/dist/electron.exe build
```

### Armadilhas encontradas

- **Git no exFAT:** "detected dubious ownership". Resolvido por variável de
  ambiente (`GIT_CONFIG_*` acima), sem mexer na configuração global.
- **`core.autocrlf=true`:** o checkout vem todo em CRLF e o Prettier do
  projeto reclama em todos os arquivos. Rodar o lint com
  `--rule '{"prettier/prettier":["error",{"endOfLine":"auto"}]}'`.
- **Sem `build/recipes/all.json`** a tela de recipes quebra ("Something went
  wrong"). O catálogo sai do submódulo com `scripts/package.js`.
- **O pnpm não baixa o binário do Electron** sozinho: rodar
  `node_modules/electron/install.js`.
- **Janela roxa:** é o fundo da janela do Ferdium quando ela está atrás de
  outra e não repinta; a captura de tela mostrava roxo também no Ferdium
  oficial. Trazendo para a frente, a interface aparece.
- **Duas janelas do Halloy:** o winit cria antes a "Winit Thread Event
  Target", janela de ferramenta. Encaixar essa deixou o Halloy solto e com
  botão na barra de tarefas. Corrigido ignorando `WS_EX_TOOLWINDOW` e
  removendo `WS_EX_APPWINDOW` no encaixe.
- **O Chromium volta a ficar por cima** do Halloy algum tempo depois do
  encaixe e passa a receber os cliques. Corrigido conferindo a ordem z a cada
  100 ms enquanto o IRC está visível.
- **`basicAuth.isModalVisible` começa `true`** sem modal na tela; o modal só
  aparece com `authInfo`. Olhar só o primeiro escondia o Halloy para sempre.
- **Apelido em uso** ("Rodrigo") fazia o servidor derrubar com "Registration
  Timeout" em loop. Corrigido com `alt_nicks` na configuração inicial.

### Nome e identidade: RodsHub

- `productName` RodsHub e `appId` com.rodslater.rodshub: dados em
  `%APPDATA%\RodsHub`, separados de um Ferdium oficial instalado na mesma
  máquina.
- Protocolo `rodshub://` no lugar de `ferdium://`.
- Atualização automática pelos Releases de `Rodslater/ferdium-app`. Antes
  apontava para o Ferdium oficial, que trocaria o app por uma versão sem IRC.
- Instalador e portátil só x64, porque o `halloy.exe` é x64.
- Ícone gerado por `build-helpers/rodshub/generate_icons.py`: app,
  instalador, bandeja (normal, não lidas, indiretas) e logo interno.
- Falta: os textos das traduções ainda dizem "Ferdium" (54 só em pt-BR).
  "Servidor Ferdium" deve continuar assim, porque é o serviço deles.
- Os testes registram o protocolo no Windows apontando para o Electron de
  desenvolvimento; remover as chaves em `HKCU\Software\Classes` ao terminar.

## Problemas abertos no Ferdium que tocam os serviços pedidos

Todos relatados em macOS; não confirmados no Windows.

- [#2538](https://github.com/ferdium/ferdium-app/issues/2538): a opção
  "Open URLs within Ferdium" nunca é lida, então login OAuth em pop-up abre
  no navegador do sistema e a sessão não volta para o Ferdium.
- [#2583](https://github.com/ferdium/ferdium-app/issues/2583): áudio de
  mensagens e chamadas mudo no WhatsApp e no Telegram (7.2.3).
- [#2363](https://github.com/ferdium/ferdium-app/issues/2363): hibernação
  vem desligada por padrão. Ligar no fork.

## Próximos passos

Feito em 13/10/2026: teclado validado, fork compilado no Windows, IRC
encaixado e testado, identidade RodsHub e ícone. Falta, nesta ordem:

1. Testar as contas reais no RodsHub (WhatsApp, Telegram, Gmail, Hotmail,
   Discord, YouTube) e os bugs #2538 (login por pop-up) e #2583 (áudio) no
   Windows.
2. Trocar "Ferdium" por "RodsHub" nos textos das traduções, sem renomear
   "Servidor Ferdium".
3. Contador de não lidas do IRC na barra lateral (patch no Halloy).
4. Serviços pré-cadastrados e hibernação ligada por padrão.
5. Gerar e testar o instalador x64, publicar o primeiro Release no fork e
   incluir o aviso de licença do Halloy (GPL-3.0). Sem certificado de
   assinatura de código, o Windows mostra o aviso do SmartScreen.

Não testado ainda: tecla morta do ABNT2 com teclado físico, monitor com
escala diferente de 100 %, instalador empacotado pelo electron-builder.
