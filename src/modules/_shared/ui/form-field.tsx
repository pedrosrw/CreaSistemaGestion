"use client";

import type { FormFieldDef } from "@/modules/_shared/types";

type FormFieldProps = {
  field: FormFieldDef;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
};

export function FormField({ field, value, onChange }: FormFieldProps) {
  const { name, label, type, required, options, placeholder, min, max, step, colSpan } = field;

  function handleChange(raw: string) {
    if (type === "number" || type === "money" || type === "percentage") {
      onChange(name, raw === "" ? 0 : Number(raw));
    } else {
      onChange(name, raw);
    }
  }

  const wrapperStyle = colSpan === 2 ? { gridColumn: "1 / -1" } : undefined;

  if (type === "select" && options) {
    return (
      <label style={wrapperStyle}>
        {label}
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(name, e.target.value)}
          required={required}
        >
          {!required && <option value="">-- Seleccionar --</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (type === "textarea") {
    return (
      <label style={wrapperStyle}>
        {label}
        <textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(name, e.target.value)}
          required={required}
          placeholder={placeholder}
          rows={3}
        />
      </label>
    );
  }

  const inputType = type === "money" || type === "percentage" ? "number" : type;
  const inputMin = min ?? (type === "money" || type === "percentage" ? 0 : undefined);
  const inputMax = max ?? (type === "percentage" ? 100 : undefined);
  const inputStep = step ?? (type === "money" ? 1 : undefined);

  return (
    <label style={wrapperStyle}>
      {label}
      <input
        type={inputType}
        value={value == null ? "" : String(value)}
        onChange={(e) => handleChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        min={inputMin}
        max={inputMax}
        step={inputStep}
      />
    </label>
  );
}

type FormFieldsGridProps = {
  fields: FormFieldDef[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
};

export function FormFieldsGrid({ fields, values, onChange }: FormFieldsGridProps) {
  return (
    <>
      {fields.map((field) => (
        <FormField key={field.name} field={field} value={values[field.name]} onChange={onChange} />
      ))}
    </>
  );
}
