import Sqids from 'sqids';

const sqids = new Sqids();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (request.method === 'POST' && url.pathname === '/create') {
      return await handleCreate(request, env);
    }

    if (request.method === 'GET' && url.pathname.startsWith('/note/')) {
      return await handleRetrieve(url.pathname.split('/').pop(), env);
    }

    // Add CORS headers for preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleCreate(request, env) {
  const noteData = await request.json();
  const noteContent = noteData.content;
  
  if (!noteContent) {
    return new Response('Note content is required', { status: 400 });
  }

  const timestamp = Date.now();
  const noteId = sqids.encode([timestamp]); // Generate a unique ID using sqids
  await env.NOTES.put(noteId, noteContent, { expirationTtl: 3600 }); // Note expires in 1 hour

  // Set CORS headers to allow cross-origin requests
  return new Response(JSON.stringify({ noteId }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function handleRetrieve(noteId, env) {
  const noteContent = await env.NOTES.get(noteId);
  
  if (!noteContent) {
    return new Response('Note not found or already read', { status: 404 });
  }

  await env.NOTES.delete(noteId); // Self-destruct note after reading

  // Set CORS headers to allow cross-origin requests
  return new Response(JSON.stringify({ content: noteContent }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
