# Planner Maker

Planner mensal simples em HTML, CSS e JavaScript, inspirado no planner físico da foto de referência.

## Como usar

1. Abra `index.html` no navegador.
2. Escolha o mês e o ano.
3. Clique nos dias para fazer anotações.
4. Use **Baixar PDF do mês** para gerar o PDF daquele mês na hora.
5. Se quiser imprimir diretamente pelo navegador, use **Imprimir mês**.

## Criar vários meses de uma vez

Na seção **Criar vários meses de uma vez**:

1. Escolha o mês/ano inicial.
2. Escolha o mês/ano final.
3. Clique em **Baixar PDF em massa**.
4. O site gera um único PDF, com uma página A4 horizontal para cada mês.

Exemplo: **Novembro de 2026 até Agosto de 2027** gera automaticamente **10 páginas** no mesmo arquivo.

## Recursos

- Segunda-feira como primeira coluna.
- Ajuste automático para meses de 4, 5 ou 6 semanas.
- Anos de 1 a 9999.
- Anos bissextos tratados automaticamente.
- Anotações persistentes por dia usando `localStorage`.
- As anotações também entram no PDF.
- Download direto de PDF de um mês.
- Download direto de PDF em massa por intervalo de meses.
- Uma página A4 paisagem por mês.
- Sem frameworks, sem servidor e sem bibliotecas externas.
- Funciona abrindo o `index.html` direto no computador.
