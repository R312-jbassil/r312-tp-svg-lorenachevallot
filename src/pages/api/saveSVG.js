import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');
import { Collections } from "../../utils/pocketbase-types";

export async function POST({ request }) {
    const data = await request.json();
    console.log("Received data to save:", data);
    try {
        const record = await pb
            .collection(Collections.NouvelleCollectionTp)
            .create(data);
        console.log("SVG saved with ID:", record.id);

        return new Response(JSON.stringify({ success: true, id: record.id }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error saving SVG:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
}