import { Plugin, TFile, MarkdownPostProcessorContext } from "obsidian";
// Legacy build runs on the main thread — no workerSrc needed
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

interface PdfPageParams {
	path: string;
	page: number;
	scale?: number;
}

/**
 * Parses the code block content.
 *
 * Expected format (YAML-style):
 *   path: attachments/my-file.pdf
 *   page: 3
 *   scale: 1.5   (optional, default 1.5)
 */
function parseParams(source: string): PdfPageParams | null {
	const params: Partial<PdfPageParams> = {};

	for (const line of source.trim().split("\n")) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;

		const key = line.slice(0, colonIdx).trim();
		const value = line.slice(colonIdx + 1).trim();

		if (key === "path") params.path = value;
		if (key === "page") params.page = parseInt(value, 10);
		if (key === "scale") params.scale = parseFloat(value);
	}

	if (!params.path || !params.page || isNaN(params.page)) return null;
	return { scale: 1.5, ...params } as PdfPageParams;
}

export default class PdfPagePlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor(
			"pdf-page",
			async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				await this.handleBlock(source, el, ctx);
			}
		);
	}

	private async handleBlock(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) {
		const params = parseParams(source);

		if (!params) {
			this.renderError(
				el,
				"Ungültige Parameter.\n\nErwartet:\n  path: pfad/zur/datei.pdf\n  page: 1"
			);
			return;
		}

		const file = this.app.vault.getAbstractFileByPath(params.path);

		if (!file || !(file instanceof TFile)) {
			this.renderError(el, `PDF nicht gefunden: "${params.path}"`);
			return;
		}

		if (file.extension !== "pdf") {
			this.renderError(el, `"${params.path}" ist keine PDF-Datei.`);
			return;
		}

		try {
			const arrayBuffer = await this.app.vault.readBinary(file);
			await this.renderPage(arrayBuffer, params, el);
		} catch (err) {
			this.renderError(el, `Fehler beim Laden der PDF: ${(err as Error).message}`);
		}
	}

	private async renderPage(
		buffer: ArrayBuffer,
		params: PdfPageParams,
		el: HTMLElement
	) {
		const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
		const pdf = await loadingTask.promise;

		if (params.page < 1 || params.page > pdf.numPages) {
			this.renderError(
				el,
				`Seite ${params.page} existiert nicht. Die PDF hat ${pdf.numPages} Seite(n).`
			);
			return;
		}

		const page = await pdf.getPage(params.page);
		const viewport = page.getViewport({ scale: params.scale ?? 1.5 });

		const container = el.createDiv({ cls: "pdf-page-container" });
		container.style.overflowX = "auto";

		const canvas = container.createEl("canvas");
		canvas.width = viewport.width;
		canvas.height = viewport.height;
		canvas.style.maxWidth = "100%";
		canvas.style.display = "block";

		const context = canvas.getContext("2d");
		if (!context) {
			this.renderError(el, "Canvas-Kontext konnte nicht erstellt werden.");
			return;
		}

		await page.render({ canvasContext: context, viewport }).promise;

		// Show page info below the canvas
		container.createEl("p", {
			text: `Seite ${params.page} / ${pdf.numPages} — ${params.path}`,
			cls: "pdf-page-info",
		}).style.cssText = "font-size: 0.75em; color: var(--text-muted); margin-top: 4px;";
	}

	private renderError(el: HTMLElement, message: string) {
		const div = el.createDiv({ cls: "pdf-page-error" });
		div.style.cssText =
			"padding: 8px 12px; border-left: 3px solid var(--color-red); color: var(--text-error); font-family: monospace; white-space: pre-wrap;";
		div.createEl("strong", { text: "PDF Page: " });
		div.appendText(message);
	}
}
