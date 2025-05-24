import { Navigate, useNavigate } from "@solidjs/router";
import { Component, onMount } from "solid-js";
import { db } from "../db/database";

const Export: Component = () => {
    const navigate = useNavigate();

    onMount(() => {
        // Check if data is loaded, if not redirect to home
        const loaded = localStorage.getItem("loaded");
        if (loaded !== "true") {
            navigate("/", { replace: true });
        }
    });

    // TODO: once everything is implemented, allow for a couple ways to export the data
    // json file, entirely self contained
    // csv file, probably multiple files for different tables
    // sqlite if feasable
    // quick image generator for sharing on social media, can also fetch pfps of convos, etc etc
    return (
        <div class="min-h-screen bg-gray-50">
            <div class="container mx-auto p-4">
                <h1 class="text-4xl font-bold mb-6">Export Data</h1>
                <p class="text-gray-600 mb-4">
                    This feature is not yet implemented. Stay tuned for updates!
                </p>
                <button 
                    class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    onClick={() => navigate("/analysis")}
                >
                    ← Back to Analysis
                </button>
            </div>
        </div>
    );
}

export default Export;