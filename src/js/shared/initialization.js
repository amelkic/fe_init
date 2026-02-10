const init = (wrappers, fn) => {
    const list = Array.from(wrappers);

    const toInitialize = import.meta.hot
        ? list
        : list.filter(w => w.getAttribute('data-initialized') !== 'true');

    toInitialize.forEach(w => {
        fn(w);
        w.setAttribute('data-initialized', 'true');
    });
}

export default init;
