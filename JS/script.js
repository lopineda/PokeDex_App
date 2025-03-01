let pokemonRepository = (function () {
    let pokemonList = [];
    const apiUrl = 'https://pokeapi.co/api/v2/pokemon/?limit=151';

    function getAll() {
        return pokemonList;
    }

    function add(pokemon) {
        if (typeof pokemon === "object" && "detailsUrl" in pokemon) {
            pokemonList.push(pokemon);
        } else {
            throw new Error(`${pokemon.name} needs more information!`);
        }
    }

    function pokemonSearch(searchName) {
        const listGroup = document.querySelector('.list-group');
        listGroup.innerHTML = ''; // Clear previous results
        pokemonList
            .filter(pokemon => pokemon.name.toLowerCase().includes(searchName.toLowerCase()))
            .forEach(addListItem);
    }

    async function loadList() {
        showLoadingSpinner();
        try {
            const response = await fetch(apiUrl);
            const json = await response.json();
            json.results.forEach(({ name, url }) => add({ name, detailsUrl: url }));
        } catch (error) {
            console.error(error);
        } finally {
            hideLoadingSpinner();
        }
    }

    async function loadDetails(pokemon) {
        showLoadingSpinner();
        try {
            const response = await fetch(pokemon.detailsUrl);
            const details = await response.json();
            pokemon.imageUrl = details.sprites.front_shiny;
            pokemon.height = details.height;
            pokemon.weight = details.weight;
        } catch (error) {
            console.error(error);
        } finally {
            hideLoadingSpinner();
        }
    }

    function showLoadingSpinner() {
        const loadingContainer = document.querySelector('#loading-container');
        loadingContainer.innerHTML = '<div class="spinner"></div>';
        loadingContainer.classList.add('is-visible');
    }

    function hideLoadingSpinner() {
        document.querySelector('#loading-container').classList.remove('is-visible');
    }

    function showDetails(pokemon) {
        loadDetails(pokemon).then(() => showModal(pokemon));
    }

    function addListItem(pokemon) {
        const listGroup = document.querySelector('.list-group');
        const listItem = document.createElement('li');
        const button = document.createElement('button');

        button.textContent = pokemon.name;
        button.classList.add('btn', 'btn-primary');
        listItem.classList.add('group-list-item');

        listItem.appendChild(button);
        listGroup.appendChild(listItem);

        button.addEventListener('click', () => showDetails(pokemon));
    }

    function showModal(pokemon) {
        const modalTitle = document.querySelector('.modal-title');
        const modalBody = document.querySelector('.modal-body');

        modalTitle.textContent = pokemon.name;
        modalBody.innerHTML = `
            <p>Height: ${pokemon.height}</p>
            <p>Weight: ${pokemon.weight}</p>
            <img class="modal-img" src="${pokemon.imageUrl}" style="width:50%">
        `;
    }

    return {
        getAll,
        add,
        addListItem,
        loadList,
        loadDetails,
        pokemonSearch
    };
})();

// Load and display Pokémon list
pokemonRepository.loadList().then(() => {
    pokemonRepository.getAll().forEach(pokemonRepository.addListItem);
});
