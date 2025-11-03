export async function GET(request: Request) {
    console.log("GET request received");
    return new Response("Hello from the API route!");
}

export async function POST(request: Request) {
    console.log("POST request received");
    const data = await request.json();
    return new Response(`Data received: ${JSON.stringify(data)}`);
}
export async function PUT(request: Request) {
    console.log("PUT request received");
    const data = await request.json();
    return new Response(`Data updated: ${JSON.stringify(data)}`);
}
export async function DELETE(request: Request) {
    console.log("DELETE request received");
    return new Response("Resource deleted");
}