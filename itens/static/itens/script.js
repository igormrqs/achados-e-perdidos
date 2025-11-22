// ============================================================
// Achados e Perdidos - UnDF
// Arquivo: script.js
//
// Eu (estudante de CC) estou cuidando do front em JS puro.
// Este arquivo cuida de:
// - buscar itens aprovados no backend (Django);
// - exibir a lista com paginação e busca;
// - enviar novos itens para análise;
// - mostrar ícones por categoria na listagem.
//
// Deixo comentários pensando em mim mesmo no futuro,
// pra eu não me perder quando voltar a ler esse código :)
// ============================================================

// ----------------- CSRF helper (padrão do Django) -----------------
// Mesmo com a view atual usando csrf_exempt, mantenho esse helper
// porque ele é útil se eu quiser ativar CSRF corretamente depois.
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
const csrftoken = getCookie('csrftoken');

// ----------------- Estado global da página -----------------
// Guardo a lista de itens vinda do servidor aqui.
// A tela sempre renderiza a partir desse array.
let lostAndFoundItems = [];
const ITEMS_PER_PAGE = 10;
let currentPage = 1;

// Referências para elementos da DOM que uso com frequência.
const itemsListInicio = document.getElementById('itemsListInicio');
const paginationInicio = document.getElementById('paginationInicio');
const searchInputInicio = document.getElementById('searchInputInicio');
const itemsListRecentes = document.getElementById('itemsListRecentes');
const searchInputRecentes = document.getElementById('searchInputRecentes');
const messageElement = document.getElementById('message');

// ----------------- Mensagens na interface -----------------

// Mostra uma mensagem de texto dentro de uma área (por exemplo, lista vazia).
function showInfoMessage(targetElement, text) {
    targetElement.innerHTML = `<p class="info-text">${text}</p>`;
}

// Mensagem de feedback logo abaixo do formulário de cadastro.
function setFormMessage(text, type = 'info') {
    if (!messageElement) return;

    messageElement.classList.remove('message-info', 'message-error', 'message-success');
    if (type === 'success') {
        messageElement.classList.add('message-success');
    } else if (type === 'error') {
        messageElement.classList.add('message-error');
    } else {
        messageElement.classList.add('message-info');
    }

    messageElement.textContent = text;
}

// ----------------- Datas e categorias -----------------

// Converto "YYYY-MM-DD" em "dd/mm/aaaa" para ficar familiar ao usuário.
function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        // Se der ruim no parse, devolvo o texto original pra não quebrar tudo.
        return dateString;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Mapeio a categoria (texto livre) para um ícone.
// Por enquanto uso emojis, mas no futuro posso trocar por SVGs.
function getCategoryIcon(categoryRaw) {
    const category = (categoryRaw || '').toLowerCase();

    if (category.includes('doc')) return '📄';           // documentos
    if (category.includes('chav')) return '🔑';          // chaves
    if (category.includes('eletr')) return '📱';         // eletrônicos
    if (category.includes('mochil') || category.includes('bolsa')) return '🎒';
    if (category.includes('roup') || category.includes('vest')) return '🧥';
    if (category.includes('livro') || category.includes('cader') || category.includes('mater')) return '📚';

    // Ícone padrão para categorias genéricas ou vazias
    return '📦';
}

// ----------------- Montagem do card de item -----------------

// Esse é o HTML de cada item da lista principal.
// Aproveito para colocar o ícone de categoria à esquerda.
function createItemCard(item) {
    const icon = getCategoryIcon(item.category);

    return `
        <div class="item-card">
            <div class="item-main">
                <div class="item-icon-circle">
                    <span class="item-icon-emoji">${icon}</span>
                </div>
                <div class="item-text-block">
                    <h3>${item.name}</h3>
                    <p class="item-location">${item.location}</p>
                </div>
            </div>
            <div class="item-meta">
                <span class="item-date">${formatDate(item.date)}</span>
            </div>
        </div>
    `;
}

// ----------------- Renderização de lista + paginação -----------------

function renderItems(listElement, items, page = 1) {
    listElement.innerHTML = '';

    if (!items || items.length === 0) {
        showInfoMessage(
            listElement,
            'Nenhum item cadastrado por enquanto. Assim que algum objeto for encontrado e aprovado pela equipe, ele aparecerá aqui.'
        );
        return;
    }

    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const itemsToShow = items.slice(startIndex, endIndex);

    itemsToShow.forEach(item => {
        listElement.innerHTML += createItemCard(item);
    });
}

function renderPagination(items) {
    paginationInicio.innerHTML = '';
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.type = 'button';
        pageBtn.classList.add('page-number');
        pageBtn.textContent = i;

        if (i === currentPage) {
            pageBtn.classList.add('active');
        }

        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderItemsAndPagination(items);
        });

        paginationInicio.appendChild(pageBtn);
    }
}

// Função central que chama a renderização da lista e da paginação.
function renderItemsAndPagination(items = lostAndFoundItems) {
    renderItems(itemsListInicio, items, currentPage);
    renderPagination(items);
}

// ----------------- Busca (texto) -----------------
// Por enquanto filtro só por nome e local, o que já cobre boa parte dos casos.

function getFilteredItemsInicio() {
    const searchTerm = (searchInputInicio?.value || '').toLowerCase().trim();
    if (!searchTerm) return [...lostAndFoundItems];

    return lostAndFoundItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.location.toLowerCase().includes(searchTerm)
    );
}

function handleSearch(inputElement, listElement, isRecentTab = false) {
    const searchTerm = (inputElement.value || '').toLowerCase().trim();

    let baseList;
    if (isRecentTab) {
        baseList = getRecentItems();
    } else {
        baseList = lostAndFoundItems;
    }

    const filteredItems = baseList.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.location.toLowerCase().includes(searchTerm)
    );

    if (!isRecentTab) {
        currentPage = 1;
        renderItemsAndPagination(filteredItems);
    } else {
        renderItems(listElement, filteredItems, 1);
        const pagRecentes = document.getElementById('paginationRecentes');
        if (pagRecentes) pagRecentes.innerHTML = '';
    }
}

// ----------------- Tabs (menu lateral) -----------------

if (searchInputInicio) {
    searchInputInicio.addEventListener('keyup', () =>
        handleSearch(searchInputInicio, itemsListInicio, false)
    );
}

if (searchInputRecentes) {
    searchInputRecentes.addEventListener('keyup', () =>
        handleSearch(searchInputRecentes, itemsListRecentes, true)
    );
}

// Controle de mudança de aba pelo menu.
document.querySelectorAll('.menu-item').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelectorAll('.menu-item').forEach(item =>
            item.classList.remove('active')
        );
        this.classList.add('active');

        const tabId = this.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(tabId).classList.remove('hidden');

        if (tabId === 'inicio') {
            renderItemsAndPagination(getFilteredItemsInicio());
        } else if (tabId === 'recentes') {
            if (searchInputRecentes) searchInputRecentes.value = '';
            renderRecentItems();
        }
    });
});

// ----------------- Itens mais recentes (aba 2) -----------------

function getRecentItems() {
    const sortedItems = [...lostAndFoundItems].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );
    return sortedItems.slice(0, 5);
}

function renderRecentItems() {
    const recentItems = getRecentItems();
    renderItems(itemsListRecentes, recentItems, 1);
}

// ----------------- Comunicação com o backend -----------------

async function loadItemsFromServer() {
    showInfoMessage(itemsListInicio, 'Carregando itens, só um instante...');

    try {
        const response = await fetch('/api/itens/');
        if (!response.ok) {
            throw new Error('Erro ao carregar itens');
        }

        const data = await response.json();
        // A API já retorna apenas itens "Em estoque" e aprovados.
        lostAndFoundItems = data;
        currentPage = 1;
        renderItemsAndPagination();
        renderRecentItems();
    } catch (error) {
        console.error(error);
        showInfoMessage(
            itemsListInicio,
            'Ops, não conseguimos carregar os itens agora. Tente recarregar a página em alguns instantes.'
        );
    }
}

// ----------------- Formulário "Adicionar Novo Item Encontrado" -----------------

const addItemForm = document.getElementById('addItemForm');

if (addItemForm) {
    addItemForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('itemName').value.trim();
        const location = document.getElementById('itemLocation').value.trim();
        const dateValue = document.getElementById('itemDate').value; // 'YYYY-MM-DD'

        if (!name || !location || !dateValue) {
            setFormMessage(
                'Por favor, preencha todos os campos obrigatórios antes de registrar o item.',
                'error'
            );
            return;
        }

        try {
            const response = await fetch('/api/itens/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    name: name,
                    location: location,
                    date: dateValue,
                }),
            });

            if (!response.ok) {
                throw new Error('Erro ao registrar item');
            }

            await response.json();

            setFormMessage(
                'Item enviado para análise da equipe interna. Após aprovação, ele ficará visível na lista pública.',
                'success'
            );

            this.reset();

            // Recarrego a lista de itens aprovados (não deve mudar imediatamente,
            // porque esse novo item ainda está com aprovado=False).
            loadItemsFromServer();
        } catch (error) {
            console.error(error);
            setFormMessage(
                'Ops, não foi possível enviar o item agora. Verifique sua conexão e tente novamente.',
                'error'
            );
        }
    });
}

// ----------------- Inicialização da página -----------------

document.addEventListener('DOMContentLoaded', () => {
    loadItemsFromServer();
});
