# Preparação para certificação Hotelbeds

## Escopo atual

Site B2C Hóspede Club, com checkout transparente Mercado Pago, pagamento antecipado
e confirmação Hotelbeds após aprovação do pagamento. O checkout atual aceita um
quarto por reserva, até oito adultos, quatro crianças de 6 a 17 anos e quatro
infantis de 0 a 5 anos, respeitando a ocupação efetivamente retornada pelo hotel.
As idades são as da data do check-in. A busca atual do catálogo é voltada ao Brasil.

São exibidas todas as tarifas elegíveis retornadas para cada quarto, incluindo os
regimes de alimentação e promoções informados pelo fornecedor. Este canal vende
tarifas `AT_WEB`, `BOOKABLE`/`RECHECK` e sem `packaging=true`. Tarifas exclusivas de
pacote ou pagas no hotel não são oferecidas neste checkout. Informar essas decisões
comerciais à equipe de certificação, sem declarar cobertura de produtos não suportados.

## Ajustes desta etapa

- Idades individuais desde a pesquisa, preservadas na URL, no retorno aos resultados,
  na chave de cache e na oferta assinada. Links antigos com crianças solicitam as
  idades antes de consultar o fornecedor. Nenhuma idade representativa é presumida.
- Uma opção selecionável por tarifa, conservando o código real do quarto e o token
  individual. A apresentação agrupa pelo código oficial do quarto e pelo regime de
  alimentação: alternativas do mesmo regime ficam em um expansor, sem eliminar
  contratos diferentes. Só rateKeys idênticas do mesmo quarto são deduplicadas.
  Mostra total Pix da estadia, referência por noite, diferença para a menor oferta
  daquele quarto e total/parcelamento no cartão. O máximo de outras ofertas não é
  usado como suposta tarifa oficial riscada. Tarifas de pacotes são excluídas antes
  do cálculo dos preços mínimos. Regimes mais completos podem ter preço menor por
  condições comerciais do fornecedor; o sistema não altera valores para ordenar regimes.
- Políticas específicas da tarifa prevalecem em cards, checkout e voucher. Todas as
  faixas de multa são preservadas, com moeda e data/hora/offset originais; o sistema
  não converte um prazo vencido em multa integral por conta própria.
- Serviços indisponíveis (`indYesOrNo=false`) não são apresentados como disponíveis;
  serviços pagos são identificados e observações de voucher são preservadas.
- Observações por `rateCommentsId` consultadas na Content API somente para a oferta
  escolhida, com data de entrada e idioma português/fallback inglês. Cache de sete dias
  em PostgreSQL, separado por ambiente, credenciais e data, além de cache em memória.
  A tabela `hotelbeds_rate_comments` é criada automaticamente; falha do cache permite
  consulta direta. Falha na obtenção das condições impede o pagamento dessa oferta.
- Avisos de serviços, incidentes aplicáveis à estadia e taxas locais discriminadas
  pelo fornecedor são incluídos nas condições da cotação antes de pagar. O texto
  genérico que prometia ausência de qualquer cobrança local foi substituído.
- Preço de venda obrigatório (`hotelMandatory`) respeitado também na apresentação
  e nas opções de parcelamento, mantendo a validação de valor no servidor.

## Configuração e deploy

Não são necessárias novas chaves para esses ajustes. Manter o ambiente de testes,
o par mTLS já validado, a senha da chave e as credenciais Mercado Pago existentes.
Não alternar `CHECKOUT_MODE` ou `HOTELBEDS_ENVIRONMENT` automaticamente para produção.
O servidor conserva as ofertas assinadas, a titularidade das reservas e vouchers,
a conciliação do pagamento e o comportamento de revisão em falhas de confirmação.

No Easypanel, publicar a branch `codex/checkout-seguro` do serviço web
`frontagencia2026`. Consultar `DEPLOY.md` para o catálogo persistido e a rotina semanal.
A varredura semanal só é habilitada em Hotelbeds production, por opção explícita
`HOTELBEDS_CATALOG_SYNC_ENABLED=true`; não consome a cota de teste por varredura automática.

## Validação local repetível

```powershell
node scripts/test-hotelbeds-certification.cjs
npm run build
```

Os testes usam fornecedores e banco simulados: idades reais inclusive zero,
cache separado por idades, facilidades pagas/ausentes, todas as faixas de multa em
moeda original, tarifas elegíveis, preço obrigatório, tokens assinados, cotação Pix
e cartão, CheckRate apenas para RECHECK e interrupção por falha de condições.
Também verificam a renderização dos seletores de idade e a consulta/cache de comentários.
Não comprovam o deploy, uma nova cobrança real ou aprovação pela Hotelbeds.

Após deploy, validar uma pesquisa com crianças, os diferentes regimes do mesmo quarto,
as condições antes do pagamento, o perfil e o PDF emitido. Preservar os pedidos anteriores;
nenhuma limpeza de banco é necessária. Testar pagamento somente com os ambientes de
teste dos dois provedores e respeitando a cota disponível.

## Dependências externas ainda pendentes

1. Concluir onboarding comercial e solicitar formalmente a certificação à Hotelbeds,
   enviando URL, fluxo, escopo/restrições, acesso de teste e voucher de exemplo por
   canal privado. Não incluir senhas ou chaves neste repositório.
2. Confirmar com o account manager o Crawler do item 5.5: aplicabilidade, template,
   campos, transporte e hospedagem do arquivo. A rotina semanal da Content API é
   distinta desse mapeamento. Não criar FTP público ou expor dados de reservas sem
   essas especificações. A integração Crawler ainda não está implementada.
3. Confirmar que o download autenticado do voucher no checkout/perfil atende ao canal
   de entrega acordado. Não existe envio automático de PDF por WhatsApp nesta etapa.
4. Após certificação e liberação das credenciais LIVE, coordenar com a Hotelbeds a
   reserva e o cancelamento de validação. Isso ainda não foi realizado e não deve
   ser feito com tarifas que gerem multa ou sem conferir as condições do fornecedor.

## Referências

- [Certificação](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/certification-process/)
- [Observações das tarifas](https://developer.hotelbeds.com/documentation/hotels/content-api/use-rate-comments/)
- [Fluxo de reservas](https://developer.hotelbeds.com/documentation/hotels/booking-api/workflow/)
- [Crawler — especificação vinculada ao checklist](https://d2gsjv9lq0esbh.cloudfront.net/static/images/crawler_setup.pdf)
