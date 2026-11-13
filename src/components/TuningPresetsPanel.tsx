import React, { useMemo, useState } from 'react';
import { BookmarkPlus, Check, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  GuitarStringTarget,
  STANDARD_TUNINGS,
  TuningPreset,
  getAllSelectableGuitarNotes,
  midiToNoteDisplay,
} from '../utils/musicTheory';
import { presetText, useI18n } from '../i18n';

interface TuningPresetsPanelProps {
  activePresetId: string;
  customPresets: TuningPreset[];
  workingStrings: GuitarStringTarget[];
  isModified: boolean;
  isChromatic: boolean;
  a4Freq: number;
  preferFlats: boolean;
  onSelectPreset: (preset: TuningPreset) => void;
  onToggleChromatic: (enabled: boolean) => void;
  onSetStringMidi: (stringNumber: number, midi: number) => void;
  onShiftStringMidi: (stringNumber: number, delta: number) => void;
  onResetToPreset: () => void;
  onSaveCustomPreset: (name: string) => void;
  onDeleteCustomPreset: (id: string) => void;
}

export const TuningPresetsPanel: React.FC<TuningPresetsPanelProps> = ({
  activePresetId,
  customPresets,
  workingStrings,
  isModified,
  isChromatic,
  a4Freq,
  preferFlats,
  onSelectPreset,
  onToggleChromatic,
  onSetStringMidi,
  onShiftStringMidi,
  onResetToPreset,
  onSaveCustomPreset,
  onDeleteCustomPreset,
}) => {
  const [customName, setCustomName] = useState('');
  const { t, lang } = useI18n();
  const [nameError, setNameError] = useState<string | null>(null);

  const selectableNotes = useMemo(
    () => getAllSelectableGuitarNotes(a4Freq, preferFlats),
    [a4Freq, preferFlats]
  );

  const allPresets = useMemo(
    () => [...STANDARD_TUNINGS, ...customPresets],
    [customPresets]
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customName.trim();
    if (!trimmed) {
      setNameError(t.tunings.nameRequired);
      return;
    }
    setNameError(null);
    onSaveCustomPreset(trimmed);
    setCustomName('');
  };

  return (
    <div className="space-y-4">
      {/* Chromatic Mode Switch */}
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">{t.tunings.chromaticTitle}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t.tunings.chromaticDesc}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isChromatic}
            aria-label={t.tunings.chromaticAria}
            data-testid="chromatic-toggle"
            onClick={() => onToggleChromatic(!isChromatic)}
            className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors ${
              isChromatic
                ? 'bg-emerald-500 border-emerald-400'
                : 'bg-control-hover border-white/10'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                isChromatic ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Preset Library */}
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-100">{t.tunings.presetsTitle}</h2>
          <span className="text-xs text-gray-400">{t.tunings.presetCount(allPresets.length)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
          {allPresets.map((preset) => {
            const isSelected = !isChromatic && activePresetId === preset.id;
            const noteSummary = preset.strings
              .map((s) => midiToNoteDisplay(s.midi, a4Freq, preferFlats).fullLabel)
              .join(' ');
            const text = presetText(preset, t);

            return (
              <div
                key={preset.id}
                className={`flex items-center justify-between gap-2 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-emerald-500/12 border-emerald-400/50'
                    : 'bg-raised border-white/[0.07] hover:bg-control'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  data-testid={`preset-${preset.id}`}
                  className="flex-1 min-h-[54px] px-3.5 py-2.5 text-left flex flex-col gap-1"
                >
                  <div className="w-full flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-gray-100 truncate">
                        {text.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                      )}
                    </div>
                    <span className="font-mono-tabular text-xs font-medium text-gray-300 shrink-0">
                      {noteSummary}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 leading-snug">
                    {lang === 'zh' && preset.category !== 'custom'
                      ? `${preset.englishName} · ${text.description}`
                      : text.description}
                  </div>
                </button>

                {preset.category === 'custom' && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomPreset(preset.id)}
                    aria-label={t.tunings.deletePresetAria(preset.name)}
                    className="min-h-[44px] min-w-[44px] mr-1 flex items-center justify-center rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Manual Per-String Customizer */}
      <section className="rounded-2xl bg-surface border border-white/[0.08] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">{t.tunings.editorTitle}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t.tunings.editorDesc}
            </p>
          </div>
          {isModified && (
            <button
              type="button"
              onClick={onResetToPreset}
              className="min-h-[36px] flex items-center gap-1 rounded-lg bg-control border border-white/10 px-2.5 text-xs text-gray-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.tunings.resetToPreset}</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-white/[0.06]">
          {workingStrings.map((str) => {
            const display = midiToNoteDisplay(str.midi, a4Freq, preferFlats);
            return (
              <div
                key={str.stringNumber}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-100">
                    {t.tunings.stringN(str.stringNumber)}
                  </div>
                  <div className="font-mono-tabular text-xs text-gray-400">
                    {display.frequency.toFixed(2)} Hz
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onShiftStringMidi(str.stringNumber, -1)}
                    aria-label={t.tunings.semitoneDownAria(str.stringNumber)}
                    data-testid={`editor-minus-${str.stringNumber}`}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-control border border-white/10 text-gray-200 hover:bg-control-hover active:scale-95 transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <label className="sr-only" htmlFor={`string-select-${str.stringNumber}`}>
                    {t.tunings.noteSelectLabel(str.stringNumber)}
                  </label>
                  <select
                    id={`string-select-${str.stringNumber}`}
                    data-testid={`editor-select-${str.stringNumber}`}
                    value={str.midi}
                    onChange={(e) => onSetStringMidi(str.stringNumber, Number(e.target.value))}
                    className="min-h-[40px] rounded-lg bg-inset border border-white/15 px-2.5 font-mono-tabular text-sm font-semibold text-gray-100 focus:outline-none focus:border-emerald-400"
                  >
                    {selectableNotes.map((note) => (
                      <option key={note.midi} value={note.midi}>
                        {note.fullLabel}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => onShiftStringMidi(str.stringNumber, 1)}
                    aria-label={t.tunings.semitoneUpAria(str.stringNumber)}
                    data-testid={`editor-plus-${str.stringNumber}`}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-control border border-white/10 text-gray-200 hover:bg-control-hover active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Custom Preset Form */}
        <form onSubmit={handleSave} className="mt-4 pt-3 border-t border-white/[0.06]">
          <label htmlFor="custom-preset-name" className="block text-xs text-gray-400 mb-1.5">
            {t.tunings.saveLabel}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="custom-preset-name"
              type="text"
              value={customName}
              onChange={(e) => {
                setCustomName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder={t.tunings.savePlaceholder}
              maxLength={24}
              className="flex-1 min-h-[44px] rounded-xl bg-inset border border-white/15 px-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="min-h-[44px] flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-400 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              <BookmarkPlus className="w-4 h-4" aria-hidden="true" />
              <span>{t.tunings.save}</span>
            </button>
          </div>
          {nameError && (
            <p role="alert" className="mt-1.5 text-xs text-rose-400">
              {nameError}
            </p>
          )}
        </form>
      </section>
    </div>
  );
};
