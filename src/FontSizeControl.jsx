import { useEffect, useState } from 'react';

const FONT_SIZE_STORAGE_KEY = 'siga_font_size';

export const FONT_SIZES = [
  { id: 'padrao', label: 'Padrão', shortLabel: 'P', title: 'Tamanho padrão de fonte (100%)' },
  { id: 'medio', label: 'Médio', shortLabel: 'M', title: 'Tamanho médio de fonte (+18%)' },
  { id: 'grande', label: 'Grande', shortLabel: 'G', title: 'Tamanho grande de fonte (+50%)' },
];

export function applyFontSize(size) {
  const validSize = FONT_SIZES.some((item) => item.id === size) ? size : 'padrao';
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-font-size', validSize);
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, validSize);
    } catch (_) {
      // localStorage indisponível ou navegação anônima
    }
  }
  return validSize;
}

export function getInitialFontSize() {
  if (typeof window === 'undefined') return 'padrao';
  try {
    const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (FONT_SIZES.some((item) => item.id === saved)) {
      return saved;
    }
  } catch (_) {
    // erro ao acessar storage
  }
  return 'padrao';
}

export default function FontSizeControl({ onSizeChange }) {
  const [currentSize, setCurrentSize] = useState('padrao');

  useEffect(() => {
    const initial = getInitialFontSize();
    setCurrentSize(initial);
    applyFontSize(initial);
  }, []);

  const selectSize = (size) => {
    const applied = applyFontSize(size);
    setCurrentSize(applied);
    if (onSizeChange) {
      onSizeChange(applied);
    }
  };

  return (
    <div
      className="font-size-control"
      role="group"
      aria-label="Acessibilidade: Ajuste de tamanho da fonte"
    >
      <span className="font-size-badge" aria-hidden="true" title="Acessibilidade visual: tamanho do texto">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19L9.5 5h1L16 19" />
          <path d="M6.2 14h7.6" />
          <path d="M16 11h5" />
          <path d="M18.5 8.5v5" />
        </svg>
        <span className="font-size-badge-text">Fonte</span>
      </span>

      <div className="font-size-pills" role="radiogroup" aria-label="Tamanho da fonte">
        {FONT_SIZES.map((option) => {
          const isActive = currentSize === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={`font-size-btn ${isActive ? 'active' : ''}`}
              onClick={() => selectSize(option.id)}
              title={option.title}
              aria-label={`Tamanho de fonte ${option.label}`}
            >
              <span className="font-size-label-full">{option.label}</span>
              <span className="font-size-label-short">{option.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
