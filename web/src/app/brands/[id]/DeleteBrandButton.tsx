'use client';

interface Props {
  brandName: string;
  deleteBrand: () => Promise<void>;
}

export default function DeleteBrandButton({ brandName, deleteBrand }: Props) {
  return (
    <form action={deleteBrand}>
      <button
        type="submit"
        className="text-xs text-red-500 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        onClick={(e) => {
          if (!confirm(`Delete brand "${brandName}"?`)) e.preventDefault();
        }}
      >
        Delete brand
      </button>
    </form>
  );
}
