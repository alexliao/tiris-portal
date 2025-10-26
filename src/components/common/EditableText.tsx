import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Pencil, Check, X, Loader2 } from 'lucide-react';

export type EditableTextSaveHandler = (nextValue: string) => Promise<string | void> | string | void;

export interface EditableTextRequestConfig {
  url: string;
  method?: 'PUT' | 'PATCH' | 'POST';
  headers?: Record<string, string>;
  buildBody?: (nextValue: string) => BodyInit;
  handleResponse?: (response: unknown) => string | void;
}

export interface EditableTextLabels {
  edit?: string;
  save?: string;
  cancel?: string;
}

export interface EditableTextProps {
  value: string;
  onSave?: EditableTextSaveHandler;
  requestConfig?: EditableTextRequestConfig;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
  inputClassName?: string;
  editButtonClassName?: string;
  actionButtonClassName?: string;
  labels?: EditableTextLabels;
  as?: keyof JSX.IntrinsicElements;
  name?: string;
}

const defaultLabels: Required<EditableTextLabels> = {
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
};

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onSave,
  requestConfig,
  disabled = false,
  className,
  textClassName,
  inputClassName,
  editButtonClassName,
  actionButtonClassName,
  labels = {},
  as = 'span',
  name,
}) => {
  const mergedLabels = { ...defaultLabels, ...labels };
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [inputWidth, setInputWidth] = useState<number | null>(null);

  const displayRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useLayoutEffect(() => {
    if (isEditing || !displayRef.current) {
      return;
    }
    const width = Math.ceil(displayRef.current.offsetWidth);
    setInputWidth(width > 0 ? width : null);
  }, [value, isEditing]);

  useLayoutEffect(() => {
    if (!isEditing || !measureRef.current) {
      return;
    }
    const width = Math.ceil(measureRef.current.offsetWidth);
    if (width > 0) {
      setInputWidth(prevWidth => {
        const nextWidth = Math.max(width + 4, prevWidth ?? 0);
        return prevWidth !== nextWidth ? nextWidth : prevWidth;
      });
    }
  }, [draft, isEditing]);

  const Element = as;

  const handleStartEditing = () => {
    if (disabled) {
      return;
    }
    if (displayRef.current) {
      const width = Math.ceil(displayRef.current.offsetWidth);
      setInputWidth(width > 0 ? width : null);
    }
    setDraft(value);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(value);
    setIsEditing(false);
    setIsSaving(false);
  };

  const executeRequest = async (nextValue: string) => {
    if (!requestConfig) {
      return;
    }

    const {
      url,
      method = 'PUT',
      headers = { 'Content-Type': 'application/json' },
      buildBody = (val: string) => JSON.stringify({ value: val }),
      handleResponse,
    } = requestConfig;

    const response = await fetch(url, {
      method,
      headers,
      body: buildBody(nextValue),
    });

    if (!response.ok) {
      throw new Error(`Failed to save editable text. HTTP ${response.status}`);
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch (err) {
      // Ignore JSON parse errors for empty bodies
    }

    if (handleResponse) {
      const maybeValue = handleResponse(payload);
      if (typeof maybeValue === 'string') {
        setDraft(maybeValue);
      }
    }
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setDraft(value);
      setIsEditing(false);
      return;
    }

    if (trimmed === value) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);

      if (onSave) {
        const result = await onSave(trimmed);
        if (typeof result === 'string') {
          setDraft(result);
        }
      } else if (requestConfig) {
        await executeRequest(trimmed);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('EditableText save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        {React.createElement(
          Element,
          {
            ref: displayRef as React.Ref<HTMLElement>,
            className: textClassName,
            title: value,
          },
          value,
        )}
        {!disabled && (
          <button
            type="button"
            onClick={handleStartEditing}
            className={clsx('inline-flex items-center justify-center p-1.5 text-inherit transition-colors hover:opacity-90 focus:outline-none', editButtonClassName)}
            title={mergedLabels.edit}
            aria-label={mergedLabels.edit}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <form className={clsx('flex items-center gap-2', className)} onSubmit={handleSubmit}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className={clsx('bg-transparent px-0 py-0 focus:outline-none focus:ring-0', inputClassName)}
          style={inputWidth ? { width: `${inputWidth}px` } : undefined}
        />
        <span
          ref={measureRef}
          className="pointer-events-none absolute left-0 top-0 whitespace-pre opacity-0"
          aria-hidden="true"
        >
          {draft || ' '}
        </span>
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className={clsx('inline-flex items-center justify-center rounded-md p-1.5 transition-colors disabled:opacity-60', actionButtonClassName)}
        title={mergedLabels.save}
        aria-label={mergedLabels.save}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={handleCancel}
        disabled={isSaving}
        className={clsx('inline-flex items-center justify-center rounded-md p-1.5 transition-colors disabled:opacity-60', actionButtonClassName)}
        title={mergedLabels.cancel}
        aria-label={mergedLabels.cancel}
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  );
};

export default EditableText;
