// ============================================================
// Achados e Perdidos - UnDF
// Arquivo: internal.js
//
// Script do PAINEL INTERNO. Aqui eu (estudante de CC) faço:
// - carregamento das reivindicações e itens via API interna;
// - filtros de busca;
// - mudança de status das reivindicações;
// - controle de estoque (devolvido / voltar para estoque);
// - troca de abas no painel.
// ============================================================

// Arrays em memória para eu poder filtrar sem ficar batendo na API
let allClaims = [];
let allItems = [];

// Referências globais aos elementos do DOM (vou preencher no DOMContentLoaded)
let claimsListEl;
let itemsListEl;
let searchClaimsInput;
let searchItemsInput;
let statusFilter;
let approvalFilter;

// ------------------------------------------------------------
// Inicialização
// ------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Pega os elementos do HTML
    claimsListEl = document.getElementById('claimsList');
    itemsListEl = document.getElementById('itemsList');
    searchClaimsInput = document.getElementById('searchClaims');
    searchItemsInput = document.getElementById('searchItems');
    statusFilter = document.getElementById('filterStatus');
    approvalFilter = document.getElementById('filterAprovado');

    setupTabs();

    // Filtros de reivindicações
    if (searchClaimsInput) {
        searchClaimsInput.addEventListener('input', () => {
            renderClaims(getFilteredClaims());
        });
    }

    // Filtros de itens
    if (searchItemsInput) {
        searchItemsInput.addEventListener('input', () => {
            renderItemsList();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            renderItemsList();
        });
    }

    if (approvalFilter) {
        approvalFilter.addEventListener('change', () => {
            renderItemsList();
        });
    }

    // Delegação de eventos para botões dentro da lista de reivindicações
    if (claimsListEl) {
        claimsListEl.addEventListener('click', onClaimsListClick);
    }

    // Delegação de eventos para botões dentro da lista de itens
    if (itemsListEl) {
        itemsListEl.addEventListener('click', onItemsListClick);
    }

    // Carrega dados iniciais
    loadClaims();
    loadItems();
});

// ------------------------------------------------------------
// Troca de abas (Reivindicações / Itens cadastrados)
// ------------------------------------------------------------

function setupTabs() {
    const menuButtons = document.querySelectorAll('.menu-item');
    const tabSections = document.querySelectorAll('.tab-content');

    menuButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.tab;

            // marca o botão ativo
            menuButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');

            // mostra/esconde as seções
            tabSections.forEach((section) => {
                if (section.id === targetId) {
                    section.classList.remove('hidden');
                } else {
                    section.classList.add('hidden');
                }
            });
        });
    });
}

// ------------------------------------------------------------
// Helpers gerais
// ------------------------------------------------------------

// Função simples só pra não correr risco de XSS caso uma string venha do backend
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Converte 'YYYY-MM-DD' para 'dd/mm/aaaa'
function formatDate(isoDate) {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
}

// ------------------------------------------------------------
// Carregamento de dados via API
// ------------------------------------------------------------

async function loadClaims() {
    if (!claimsListEl) return;

    try {
        const response = await fetch('/api/interno/reivindicacoes/');
        if (!response.ok) {
            throw new Error('Erro ao carregar reivindicações');
        }
        allClaims = await response.json();
        renderClaims(getFilteredClaims());
    } catch (error) {
        console.error(error);
        claimsListEl.innerHTML = `
            <p class="info-text">
                Não foi possível carregar as reivindicações no momento.
            </p>
        `;
    }
}

async function loadItems() {
    if (!itemsListEl) return;

    try {
        const response = await fetch('/api/interno/itens/');
        if (!response.ok) {
            throw new Error('Erro ao carregar itens internos');
        }
        allItems = await response.json();
        renderItemsList();
    } catch (error) {
        console.error(error);
        itemsListEl.innerHTML = `
            <p class="info-text">
                Não foi possível carregar a lista de itens cadastrados.
            </p>
        `;
    }
}

// ------------------------------------------------------------
// Filtro e render das REIVINDICAÇÕES
// ------------------------------------------------------------

function getFilteredClaims() {
    let result = [...allClaims];

    const term = (searchClaimsInput?.value || '').toLowerCase().trim();
    if (term) {
        result = result.filter((claim) => {
            const nome = (claim.nome_requerente || '').toLowerCase();
            const contato = (claim.contato || '').toLowerCase();
            const detalhes = (claim.detalhes || '').toLowerCase();
            const vinculo = (claim.vinculo || '').toLowerCase();
            const identificacao = (claim.identificacao || '').toLowerCase();
            const itemNome = (claim.item?.nome || '').toLowerCase();
            const idStr = String(claim.id || '');

            // Procuro termo em vários campos
            return (
                nome.includes(term) ||
                contato.includes(term) ||
                detalhes.includes(term) ||
                vinculo.includes(term) ||
                identificacao.includes(term) ||
                itemNome.includes(term) ||
                idStr.includes(term)
            );
        });
    }

    return result;
}

function renderClaims(claims) {
    if (!claimsListEl) return;

    if (!claims || !claims.length) {
        claimsListEl.innerHTML = `
            <p class="info-text">
                Nenhuma reivindicação registrada até o momento.
            </p>
        `;
        return;
    }

    const html = claims.map(createClaimCard).join('');
    claimsListEl.innerHTML = html;
}

// Aqui eu defino os status possíveis para o select
const CLAIM_STATUS_OPTIONS = [
    'Pendente',
    'Em análise',
    'Aprovada',
    'Recusada',
];

function createClaimCard(claim) {
    const item = claim.item || {};

    const statusOptionsHtml = CLAIM_STATUS_OPTIONS
        .map((status) => {
            const selected = status === claim.status ? 'selected' : '';
            return `<option value="${status}" ${selected}>${status}</option>`;
        })
        .join('');

    return `
        <div class="item-card claim-card internal-claim-card"
             data-claim-id="${claim.id}"
             data-item-id="${item.id}">
            <div class="claim-main">
                <h3>${escapeHtml(item.nome || 'Item sem nome')}</h3>
                <p class="item-location">
                    ${escapeHtml(item.local_encontrado || 'local não informado')}
                    • Encontrado em ${formatDate(item.data_encontrado)}
                </p>

                <p class="claim-details">
                    <strong>Requerente:</strong> ${escapeHtml(claim.nome_requerente || '')}
                    ${claim.vinculo ? ` (${escapeHtml(claim.vinculo)})` : ''}
                    ${claim.identificacao ? ` — ID: ${escapeHtml(claim.identificacao)}` : ''}
                </p>
                <p class="claim-details">
                    <strong>Contato:</strong> ${escapeHtml(claim.contato || 'não informado')}
                </p>
                <p class="claim-details">
                    <strong>Detalhes informados:</strong> ${escapeHtml(claim.detalhes || '')}
                </p>
                <p class="claim-details">
                    <strong>Data da solicitação:</strong> ${formatDate(claim.data_envio)}
                </p>
            </div>
            <div class="claim-actions">
                <p class="claim-status-label">
                    Status da reivindicação:
                </p>
                <select class="claim-status-select">
                    ${statusOptionsHtml}
                </select>
                <button type="button"
                        class="claim-save-button">
                    Salvar status
                </button>

                <p class="claim-status-label item-status-label">
                    Item: <span>${item.status || 'Sem status'}</span>
                </p>

                <button type="button"
                        class="item-reset-button"
                        ${item.status === 'Em estoque' ? 'disabled' : ''}>
                    Voltar item para estoque
                </button>
                <p class="claim-helper-text">
                    Use apenas em caso de correção de erro.
                </p>
            </div>
        </div>
    `;
}

// ------------------------------------------------------------
// Ações na lista de reivindicações
// ------------------------------------------------------------

async function onClaimsListClick(event) {
    const card = event.target.closest('.internal-claim-card');
    if (!card) return;

    const claimId = Number(card.dataset.claimId);
    const itemId = Number(card.dataset.itemId) || null;

    const saveBtn = event.target.closest('.claim-save-button');
    const resetBtn = event.target.closest('.item-reset-button');

    if (saveBtn) {
        const select = card.querySelector('.claim-status-select');
        if (!select) return;

        const newStatus = select.value;
        await updateClaimStatus(claimId, itemId, newStatus);
        return;
    }

    if (resetBtn && !resetBtn.disabled && itemId) {
        await resetItemToStock(itemId);
    }
}

async function updateClaimStatus(claimId, itemId, newStatus) {
    try {
        const response = await fetch(`/api/interno/reivindicacoes/${claimId}/status/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar status da reivindicação');
        }

        const data = await response.json();

        // Atualiza array de reivindicações
        allClaims = allClaims.map((claim) => {
            if (claim.id === claimId) {
                const newClaim = { ...claim, status: data.status };
                if (itemId && data.item_status && claim.item) {
                    newClaim.item = { ...claim.item, status: data.item_status };
                }
                return newClaim;
            }
            return claim;
        });

        // Atualiza também o array de itens, se recebemos novo status
        if (itemId && data.item_status) {
            allItems = allItems.map((item) => {
                if (item.id === itemId) {
                    return { ...item, status: data.item_status };
                }
                return item;
            });
        }

        renderClaims(getFilteredClaims());
        renderItemsList();
    } catch (error) {
        console.error(error);
        alert('Não foi possível salvar o status da reivindicação. Tente novamente.');
    }
}

// ------------------------------------------------------------
// Filtro e render dos ITENS (aba "Itens cadastrados")
// ------------------------------------------------------------

function getFilteredItems() {
    let result = [...allItems];

    const term = (searchItemsInput?.value || '').toLowerCase().trim();
    if (term) {
        result = result.filter((item) => {
            const nome = (item.nome || '').toLowerCase();
            const local = (item.local_encontrado || '').toLowerCase();
            const categoria = (item.categoria || '').toLowerCase();
            return (
                nome.includes(term) ||
                local.includes(term) ||
                categoria.includes(term)
            );
        });
    }

    if (statusFilter && statusFilter.value) {
        result = result.filter((item) => item.status === statusFilter.value);
    }

    if (approvalFilter && approvalFilter.value !== '') {
        const aprovadoBool = approvalFilter.value === 'true';
        result = result.filter((item) => item.aprovado === aprovadoBool);
    }

    return result;
}

function renderItemsList() {
    if (!itemsListEl) return;

    const items = getFilteredItems();

    if (!items || !items.length) {
        itemsListEl.innerHTML = `
            <p class="info-text">
                Nenhum item cadastrado corresponde aos filtros selecionados.
            </p>
        `;
        return;
    }

    const html = items.map(createInternalItemCard).join('');
    itemsListEl.innerHTML = html;
}

function createInternalItemCard(item) {
    const aprovacaoTexto = item.aprovado
        ? 'Aprovado para aparecer no site'
        : 'Pendente de aprovação';

    const canBackToStock = item.status !== 'Em estoque';
    const canMarkReturned = item.status !== 'Devolvido';

    return `
        <div class="item-card claim-card internal-item-card"
             data-item-id="${item.id}">
            <div class="claim-main">
                <h3>${escapeHtml(item.nome)}</h3>
                <p class="item-location">
                    ${escapeHtml(item.local_encontrado || 'local não informado')}
                    • Encontrado em ${formatDate(item.data_encontrado)}
                </p>
                <p class="claim-details">
                    <strong>Categoria:</strong>
                    ${escapeHtml(item.categoria || 'não informado')}
                </p>
                <p class="claim-details">
                    <strong>Aprovação:</strong>
                    ${aprovacaoTexto}
                </p>
            </div>
            <div class="claim-actions">
                <p class="claim-status-label">
                    Status do item: <span>${item.status}</span>
                </p>
                <button
                    type="button"
                    class="item-mark-returned-button"
                    ${canMarkReturned ? '' : 'disabled'}
                >
                    Marcar como devolvido
                </button>

                <button
                    type="button"
                    class="item-reset-button"
                    ${canBackToStock ? '' : 'disabled'}
                >
                    Voltar item para estoque
                </button>
            </div>
        </div>
    `;
}

// ------------------------------------------------------------
// Ações na aba de ITENS
// ------------------------------------------------------------

async function onItemsListClick(event) {
    const card = event.target.closest('.internal-item-card');
    if (!card) return;

    const itemId = Number(card.dataset.itemId);
    if (!itemId) return;

    const markReturnedBtn = event.target.closest('.item-mark-returned-button');
    const resetBtn = event.target.closest('.item-reset-button');

    if (markReturnedBtn && !markReturnedBtn.disabled) {
        await markItemAsReturned(itemId);
        return;
    }

    if (resetBtn && !resetBtn.disabled) {
        await resetItemToStock(itemId);
    }
}

async function markItemAsReturned(itemId) {
    if (!confirm('Marcar este item como devolvido?')) return;

    try {
        const response = await fetch(`/api/interno/itens/${itemId}/devolver/`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error('Erro ao marcar item como devolvido');
        }

        const data = await response.json();

        // Atualiza array em memória
        allItems = allItems.map((item) =>
            item.id === itemId ? { ...item, status: data.status || 'Devolvido' } : item
        );

        // Atualiza também nas reivindicações
        allClaims = allClaims.map((claim) => {
            if (claim.item && claim.item.id === itemId) {
                return {
                    ...claim,
                    item: { ...claim.item, status: data.status || 'Devolvido' },
                };
            }
            return claim;
        });

        renderItemsList();
        renderClaims(getFilteredClaims());
    } catch (error) {
        console.error(error);
        alert('Não foi possível marcar o item como devolvido. Tente novamente.');
    }
}

async function resetItemToStock(itemId) {
    if (!confirm('Voltar este item para "Em estoque"?')) return;

    try {
        const response = await fetch(`/api/interno/itens/${itemId}/back_to_stock/`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error('Erro ao voltar item para estoque');
        }

        const data = await response.json();

        allItems = allItems.map((item) =>
            item.id === itemId ? { ...item, status: data.status || 'Em estoque' } : item
        );

        allClaims = allClaims.map((claim) => {
            if (claim.item && claim.item.id === itemId) {
                return {
                    ...claim,
                    item: { ...claim.item, status: data.status || 'Em estoque' },
                };
            }
            return claim;
        });

        renderItemsList();
        renderClaims(getFilteredClaims());
    } catch (error) {
        console.error(error);
        alert('Não foi possível voltar o item para estoque. Tente novamente.');
    }
}
