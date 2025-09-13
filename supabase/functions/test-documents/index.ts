import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  
  console.log('Path segments:', pathSegments);
  console.log('Method:', req.method);
  
  if (pathSegments[0] === 'test-documents') {
    if (pathSegments.length === 1) {
      return new Response(JSON.stringify({ message: 'Test documents endpoint working' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (pathSegments.length === 2 && pathSegments[1] === 'upload-url') {
      return new Response(JSON.stringify({ 
        message: 'Upload URL endpoint working',
        uploadUrl: 'test-url',
        headers: { 'Content-Type': 'application/pdf' },
        objectPath: 'test/path',
        expiresAt: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  return new Response('Not Found', { status: 404 });
};

serve(handler);
