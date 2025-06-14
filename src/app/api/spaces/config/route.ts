import { getSpacesConfig } from '@/lib/spaces';

export const GET = async () => {
  try {
    const config = getSpacesConfig();
    return Response.json(config, { status: 200 });
  } catch (err) {
    console.error('Error getting spaces config:', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
}; 