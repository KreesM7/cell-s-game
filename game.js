function build() {
    const FULL_POOL = [...]; // Define FULL_POOL based on requirements
    const ALL_LETTERS = [...]; // Define ALL_LETTERS based on requirements
    const DIGRAPHS = [...]; // Define DIGRAPHS based on requirements

    // Initialize the pool with unique letters and digraphs
    let pool = [...FULL_POOL, ...ALL_LETTERS, ...DIGRAPHS];

    // Fisher-Yates shuffle algorithm
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]]; // Swap elements
    }

    // Ensure unique non-repeating letters on the board
    let uniquePool = [...new Set(pool)];

    // Logic for placing letters on the board ensuring no duplicates across cells
    const board = uniquePool.slice(0, targetSize); // targetSize defined by number of cells

    return board;
}