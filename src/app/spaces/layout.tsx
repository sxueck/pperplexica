import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Spaces - Perplexica',
  description: 'Public spaces for sharing Q&A entries with the community.',
};

export default function SpacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 