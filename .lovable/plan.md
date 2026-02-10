

## Redesign da Interface POS - Tela Intuitiva para Garcom

### Resumo
Redesenhar o componente `POSInterface.tsx` para ter um layout visual fiel a referencia enviada, com sidebar de categorias a esquerda e grade de produtos a direita. As categorias e produtos so podem ser gerenciados por Super Admin ou Host.

### Mudancas Visuais

**Layout em duas colunas (desktop):**

```text
+----------------------------+------------------------------------------+------------------+
| CATEGORIAS (sidebar)       | PRODUTOS                                 | CARRINHO         |
|                            |                                          |                  |
| [TODAS]    [ENTRADAS]      | [Buscar produto...]                      | Item 1  x2  R$X |
| [BEBIDAS]  [SOBREMESAS]    |                                          | Item 2  x1  R$X |
| [PRATOS]   [SUCOS]         | +------+ +------+ +------+ +------+     |                  |
| [CAFE]     [MILKSHAKES]    | |Prod1 | |Prod2 | |Prod3 | |Prod4 |     | Subtotal: R$XX   |
|                            | |R$XX  | |R$XX  | |R$XX  | |R$XX  |     | [Enviar Pedido]  |
| [VOLTAR]   [REVISAR >>]    | +------+ +------+ +------+ +------+     |                  |
+----------------------------+------------------------------------------+------------------+
```

**Mobile:** Categorias em scroll horizontal no topo, carrinho em drawer inferior.

### Detalhes Tecnicos

**Arquivo modificado:** `src/components/POSInterface.tsx`

1. **Sidebar de categorias (coluna esquerda ~200px):**
   - Grade `grid-cols-2 gap-2` de botoes grandes com `bg-primary text-primary-foreground`
   - Botao "Todas" sempre no topo com destaque visual
   - Botoes "Voltar" e "Revisar Pedido" na parte inferior
   - No mobile: barra horizontal com scroll

2. **Area de produtos (coluna central):**
   - Barra de busca no topo
   - Grade `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` de cards de produto
   - Cada card com icone circular, nome e preco (layout existente mantido)

3. **Carrinho (coluna direita - mantido):**
   - Logica e visual existente preservados sem alteracao

4. **Remocao dos filtros antigos:**
   - Remover os botoes "Pratos" e "Bebidas" da barra horizontal atual (tipo typeFilter)
   - Categorias PDV passam a ser exclusivamente na sidebar lateral

5. **Restricao de permissao:**
   - As categorias PDV e os produtos (pratos/itens de venda direta) ja sao gerenciados nas telas de Pratos e Estoque, acessiveis apenas a Super Admin e Host
   - Nenhuma alteracao de permissao e necessaria no POS em si, pois o garcom apenas visualiza e seleciona produtos - nao edita

### O que NAO muda
- `DiningRoom.tsx` - fluxo de abertura do POS ja esta correto
- Banco de dados - nenhuma alteracao
- Edge functions - nenhuma alteracao
- Logica de carrinho, validacao de estoque e envio para cozinha - preservados integralmente

