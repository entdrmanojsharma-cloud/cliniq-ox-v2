import { create } from 'zustand';

let loadingTimer = null;

export const useLoadingStore = create((set, get) => ({
  activeFetches: 0,
  activeNavigations: 0,
  showLoadingBar: false,

  startFetch: () => {
    set((state) => {
      const nextFetches = state.activeFetches + 1;
      get()._updateTimer(nextFetches, state.activeNavigations);
      return { activeFetches: nextFetches };
    });
  },

  endFetch: () => {
    set((state) => {
      const nextFetches = Math.max(0, state.activeFetches - 1);
      get()._updateTimer(nextFetches, state.activeNavigations);
      return { activeFetches: nextFetches };
    });
  },

  startNavigation: () => {
    set((state) => {
      const nextNavs = state.activeNavigations + 1;
      get()._updateTimer(state.activeFetches, nextNavs);
      return { activeNavigations: nextNavs };
    });
  },

  endNavigation: () => {
    set((state) => {
      const nextNavs = Math.max(0, state.activeNavigations - 1);
      get()._updateTimer(state.activeFetches, nextNavs);
      return { activeNavigations: nextNavs };
    });
  },

  _updateTimer: (fetches, navs) => {
    const isBusy = fetches > 0 || navs > 0;
    if (isBusy) {
      if (!loadingTimer && !get().showLoadingBar) {
        loadingTimer = setTimeout(() => {
          set({ showLoadingBar: true });
        }, 200);
      }
    } else {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = null;
      }
      if (get().showLoadingBar) {
        set({ showLoadingBar: false });
      }
    }
  }
}));
