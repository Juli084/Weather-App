# Temperatura agora

Mostra a temperatura, a sensação térmica, a umidade, o vento e a condição do tempo agora em qualquer
cidade. Feito com React 19, Vite e Tailwind CSS.

## Como funciona

1. O nome digitado vai para a API de geocodificação da [Open-Meteo](https://open-meteo.com/), que
   devolve as coordenadas da cidade.
2. Com as coordenadas, a API de previsão devolve as condições atuais.
3. O código de tempo da OMM é traduzido para uma descrição em português.

A Open-Meteo não exige chave de API, então não há segredo nenhum no código do navegador. Os dados
são distribuídos sob CC BY 4.0, com a atribuição exibida na página.

Cidade não encontrada e falha de rede viram mensagens na tela. Se duas pesquisas se cruzarem, vale
a última.

## Rodando localmente

Requer Node 20.19 ou 22.12 em diante.

```bash
npm install
npm run dev
```

```bash
npm run lint
npm run build
```

## Histórico

A primeira versão, de 2022, usava Create React App e a WeatherAPI com a chave escrita no código.
Em 2026 o projeto foi migrado para Vite, e a API foi trocada por uma que não precisa de chave.
