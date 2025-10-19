import pb from "../../utils/pb.ts";
import { Collections } from "../../utils/pocketbase-types.ts";

export async function POST({ request, locals }) {
  try {
    // Vérifier que l'utilisateur est connecté
    if (!locals.user) {
      return new Response(
        JSON.stringify({ success: false, message: "Non autorisé" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { svgId } = await request.json();

    if (!svgId) {
      return new Response(
        JSON.stringify({ success: false, message: "ID SVG manquant" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      "Attempting to delete SVG:",
      svgId,
      "for user:",
      locals.user.id
    );

    // Supprimer le SVG
    await pb.collection(Collections.NouvelleCollectionTp).delete(svgId);

    console.log("SVG deleted successfully");

    return new Response(
      JSON.stringify({ success: true, message: "SVG supprimé avec succès" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting SVG:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de la suppression",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
