import { redirect } from 'next/navigation';

type Props = { params: { id: string } };

export default function BrandIndexPage({ params }: Props) {
  redirect(`/brands/${params.id}/content`);
}
