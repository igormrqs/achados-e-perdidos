// ============================================================
// Achados e Perdidos - UnDF
// Arquivo: script.js
//
// Script da parte pública:
// - carrega itens da API /api/itens/;
// - controla abas (Início / Itens mais recentes / Sobre);
// - controla busca por texto;
// - abre modal de Blind Claim e envia os dados para a API.
// ============================================================

const ITEMS_PER_PAGE = 10;

let allItems = [];
let currentPageInicio = 1;
let currentPageRecentes = 1;

// Elementos principais
const tabs = document.querySelectorAll('.menu-item[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');

const itemsListInicio = document.getElementById('itemsListInicio');
const itemsListRecentes = document.getElementById('itemsListRecentes');

const paginationInicio = document.getElementById('paginationInicio');
const paginationRecentes = document.getElementById('paginationRecentes');

const searchInputInicio = document.getElementById('searchInputInicio');
const searchInputRecentes = document.getElementById('searchInputRecentes');

// Modal de Blind Claim
const claimModal = document.getElementById('claimModal');
const claimCloseButton = document.getElementById('claimCloseButton');
const claimItemInfo = document.getElementById('claimItemInfo');
const claimForm = document.getElementById('claimForm');
const claimMessage = document.getElementById('claimMessage');

// Campos do formulário do modal
const claimNomeInput = document.getElementById('claimNome');
const claimVinculoSelect = document.getElementById('claimVinculo');
const claimIdentificacaoInput = document.getElementById('claimIdentificacao');
const claimContatoInput = document.getElementById('claimContato');
const claimDetalhesInput = document.getElementById('claimDetalhes');

let currentClaimItemId = null;

// ----------------- Helpers -----------------

function formatDateISO(dateString) {
    // dateString: "YYYY-MM-DD"
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    return `${day}/${month}/${year}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function getCategoryEmoji(category) {
    if (!category) return '📦';
    const c = category.toLowerCase();

    if (c.includes('chave')) return '🔑';
    if (c.includes('document')) return '📄';
    if (c.includes('cartão') || c.includes('cartao')) return '💳';
    if (c.includes('eletronic') || c.includes('celular') || c.includes('fone')) return '📱';
    if (c.includes('roupa') || c.includes('casaco')) return '🧥';
    if (c.includes('mochila') || c.includes('bolsa')) return '🎒';

    return '📦';
}

// ----------------- Tabs -----------------

tabs.forEach(tab => {
    tab.addEventListener('click', (event) => {
        event.preventDefault();
        const target = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        tabContents.forEach(content => {
            if (content.id === target) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    });
});

// ----------------- Renderização de itens -----------------

function createItemCard(item) {
    const emoji = getCategoryEmoji(item.category);

    return `
        <div class="item-card">
            <div class="item-main">
                <div class="item-icon-circle">
                    <span class="item-icon-emoji">${emoji}</span>
                </div>
                <div class="item-text-block">
                    <h3>${escapeHtml(item.name)}</h3>
                    <p class="item-location">
                        ${escapeHtml(item.location || '')}
                    </p>
                </div>
            </div>
            <div class="item-meta">
                <span class="item-date">${formatDateISO(item.date)}</span>
                <button
                    type="button"
                    class="claim-button"
                    data-item-id="${item.id}"
                    data-item-name="${escapeHtml(item.name)}"
                    data-item-location="${escapeHtml(item.location || '')}"
                >
                    Este item pode ser meu
                </button>
            </div>
        </div>
    `;
}

function renderItems(containerElement, items, currentPage) {
    if (!containerElement) return;

    if (!items || items.length === 0) {
        containerElement.innerHTML = '<p class="info-text">Nenhum item encontrado.</p>';
        return;
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageItems = items.slice(startIndex, endIndex);

    containerElement.innerHTML = '';
    pageItems.forEach(item => {
        containerElement.innerHTML += createItemCard(item);
    });
}

function renderPagination(containerElement, items, currentPage, onPageChange) {
    if (!containerElement) return;

    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    if (totalPages <= 1) {
        containerElement.innerHTML = '';
        return;
    }

    containerElement.innerHTML = '';
    for (let page = 1; page <= totalPages; page++) {
        const button = document.createElement('button');
        button.classList.add('page-number');
        if (page === currentPage) {
            button.classList.add('active');
        }
        button.textContent = page;
        button.addEventListener('click', () => onPageChange(page));
        containerElement.appendChild(button);
    }
}

// ----------------- Filtro de busca -----------------

function getFilteredItems(items, searchTerm) {
    const term = (searchTerm || '').toLowerCase();
    if (!term) return [...items];

    return items.filter(item => {
        const name = (item.name || '').toLowerCase();
        const location = (item.location || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        return (
            name.includes(term) ||
            location.includes(term) ||
            category.includes(term)
        );
    });
}

function updateInicioList() {
    const filtered = getFilteredItems(allItems, searchInputInicio ? searchInputInicio.value : '');
    renderItems(itemsListInicio, filtered, currentPageInicio);
    renderPagination(paginationInicio, filtered, currentPageInicio, (page) => {
        currentPageInicio = page;
        updateInicioList();
    });
}

function updateRecentesList() {
    // por simplicidade, "recentes" = primeiros N itens ordenados por data
    const sorted = [...allItems].sort((a, b) => {
        if (a.date < b.date) return 1;
        if (a.date > b.date) return -1;
        return 0;
    });
    const filtered = getFilteredItems(sorted, searchInputRecentes ? searchInputRecentes.value : '');
    renderItems(itemsListRecentes, filtered, currentPageRecentes);
    renderPagination(paginationRecentes, filtered, currentPageRecentes, (page) => {
        currentPageRecentes = page;
        updateRecentesList();
    });
}

if (searchInputInicio) {
    searchInputInicio.addEventListener('input', () => {
        currentPageInicio = 1;
        updateInicioList();
    });
}

if (searchInputRecentes) {
    searchInputRecentes.addEventListener('input', () => {
        currentPageRecentes = 1;
        updateRecentesList();
    });
}

// ----------------- Modal de Blind Claim -----------------

function openClaimModal(itemId, itemName, itemLocation) {
    currentClaimItemId = itemId;
    claimItemInfo.textContent = `${itemName} — ${itemLocation || ''}`;
    claimMessage.textContent = '';

    // limpa os campos
    claimNomeInput.value = '';
    claimVinculoSelect.value = '';
    claimIdentificacaoInput.value = '';
    claimContatoInput.value = '';
    claimDetalhesInput.value = '';

    claimModal.classList.remove('hidden');
}

function closeClaimModal() {
    currentClaimItemId = null;
    claimModal.classList.add('hidden');
}

if (claimCloseButton) {
    claimCloseButton.addEventListener('click', closeClaimModal);
}

if (claimModal) {
    claimModal.addEventListener('click', (event) => {
        if (event.target === claimModal) {
            closeClaimModal();
        }
    });
}

// delegação para os botões "Este item pode ser meu"
document.addEventListener('click', (event) => {
    const button = event.target.closest('.claim-button');
    if (!button) return;

    const itemId = Number(button.dataset.itemId);
    const itemName = button.dataset.itemName || '';
    const itemLocation = button.dataset.itemLocation || '';
    if (!itemId) return;

    openClaimModal(itemId, itemName, itemLocation);
});

// envio do formulário de reivindicação
if (claimForm) {
    claimForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!currentClaimItemId) return;

        const nome = claimNomeInput.value.trim();
        const vinculo = claimVinculoSelect.value;
        const identificacao = claimIdentificacaoInput.value.trim();
        const contato = claimContatoInput.value.trim();
        const detalhes = claimDetalhesInput.value.trim();

        if (!nome || !detalhes) {
            claimMessage.textContent = 'Por favor, preencha pelo menos seu nome e os detalhes que comprovam que o item é seu.';
            claimMessage.className = 'claim-message message-error';
            return;
        }

        try {
            const response = await fetch(`/api/itens/${currentClaimItemId}/claim/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nome,
                    vinculo,
                    identificacao,
                    contato,
                    detalhes,
                }),
            });

            if (!response.ok) {
                throw new Error('Erro ao enviar reivindicação');
            }

            const data = await response.json();
            claimMessage.textContent = data.mensagem || 'Reivindicação enviada com sucesso.';
            claimMessage.className = 'claim-message message-success';

            // opcional: fechar o modal depois de alguns segundos
            setTimeout(() => {
                closeClaimModal();
            }, 1500);

        } catch (error) {
            console.error(error);
            claimMessage.textContent = 'Não foi possível enviar a reivindicação. Tente novamente em alguns instantes.';
            claimMessage.className = 'claim-message message-error';
        }
    });
}

// ----------------- Carregar itens da API -----------------

async function loadItems() {
    try {
        const response = await fetch('/api/itens/');
        if (!response.ok) {
            throw new Error('Erro ao carregar itens');
        }

        const data = await response.json();
        // data = [{id, name, location, date (YYYY-MM-DD), category, description, status}, ...]
        allItems = data;

        currentPageInicio = 1;
        currentPageRecentes = 1;
        updateInicioList();
        updateRecentesList();
    } catch (error) {
        console.error(error);
        if (itemsListInicio) {
            itemsListInicio.innerHTML = '<p class="info-text">Não foi possível carregar os itens agora. Tente recarregar a página em alguns instantes.</p>';
        }
        if (itemsListRecentes) {
            itemsListRecentes.innerHTML = '<p class="info-text">Não foi possível carregar os itens agora.</p>';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadItems();
});
