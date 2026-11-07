// --- ESTADO GLOBAL COMPARTIDO ---
export const state = {
    favorites: [],
    library: {},
    folderNames: {},
    currentFolderPath: null,
    songsByPath: {},
    selectedSong: null,
    currentQueue: [],
    currentIndex: -1,
    history: [],
    playMode: 'list',

    // Virtual scroll
    songsToRenderGlobal: [],
    itemsDisplayed: 0,
    scrollObserver: null,
};

export const ITEMS_PER_BATCH = 50;
