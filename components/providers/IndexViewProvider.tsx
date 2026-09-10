'use client';

import {
  useCallback,
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type IndexViewMode = 'horizontal' | 'vertical';
export type ActiveIndexItem = { slug: string; key: string };

type IndexViewContextValue = {
  mode: IndexViewMode;
  revision: number;
  isTransitioning: boolean;
  activeItem: ActiveIndexItem | null;
  toggleMode: () => void;
  completeTransition: (revision: number) => void;
  setActiveItem: (item: ActiveIndexItem) => void;
};

const IndexViewContext = createContext<IndexViewContextValue | null>(null);

export function IndexViewProvider({ children }: { children: ReactNode }) {
  const [activeItem, setActiveItemState] = useState<ActiveIndexItem | null>(
    null,
  );
  const [view, setView] = useState<{
    mode: IndexViewMode;
    revision: number;
    isTransitioning: boolean;
  }>({
    mode: 'horizontal',
    revision: 0,
    isTransitioning: false,
  });

  const toggleMode = useCallback(() => {
    setView((current) => {
      if (current.isTransitioning) return current;
      return {
        mode: current.mode === 'horizontal' ? 'vertical' : 'horizontal',
        revision: current.revision + 1,
        isTransitioning: true,
      };
    });
  }, []);

  const completeTransition = useCallback((revision: number) => {
    setView((current) =>
      current.revision === revision
        ? { ...current, isTransitioning: false }
        : current,
    );
  }, []);

  const setActiveItem = useCallback((item: ActiveIndexItem) => {
    setActiveItemState((current) =>
      current?.slug === item.slug && current.key === item.key ? current : item,
    );
  }, []);

  const value = useMemo(
    () => ({
      ...view,
      activeItem,
      toggleMode,
      completeTransition,
      setActiveItem,
    }),
    [activeItem, completeTransition, setActiveItem, toggleMode, view],
  );

  return (
    <IndexViewContext.Provider value={value}>
      {children}
    </IndexViewContext.Provider>
  );
}

export function useIndexView() {
  const context = useContext(IndexViewContext);
  if (!context) {
    throw new Error('useIndexView must be used inside IndexViewProvider');
  }
  return context;
}
