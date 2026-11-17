 import html2canvas from "html2canvas";

import {
  getReportVisuals,
  mergeReportVisuals,
  type FloorReportSnapshot,
} from "../lib/reportVisualStore";

function wait(
  milliseconds: number
) {
  return new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function containsUnsupportedColor(
  value: string
) {
  return /(?:color-mix|color|oklch|oklab|lch|lab)\s*\(/i.test(
    value
  );
}

function replaceColorFunctions(
  value: string,
  fallback: string
) {
  const functionNames =
    /(?:color-mix|color|oklch|oklab|lch|lab)\s*\(/gi;

  let result = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while (
    (match =
      functionNames.exec(
        value
      )) !== null
  ) {
    const start =
      match.index;

    result +=
      value.slice(
        cursor,
        start
      );

    const openIndex =
      value.indexOf(
        "(",
        start
      );

    if (
      openIndex === -1
    ) {
      result += fallback;

      cursor =
        start +
        match[0].length;

      continue;
    }

    let depth = 0;
    let end =
      openIndex;

    for (
      ;
      end < value.length;
      end += 1
    ) {
      const character =
        value[end];

      if (
        character === "("
      ) {
        depth += 1;
      }

      if (
        character === ")"
      ) {
        depth -= 1;

        if (
          depth === 0
        ) {
          end += 1;
          break;
        }
      }
    }

    result += fallback;

    cursor = end;
  }

  result += value.slice(
    cursor
  );

  return result;
}

function fallbackForProperty(
  property: string
) {
  const name =
    property.toLowerCase();

  if (
    name === "color" ||
    name.includes("text-color") ||
    name.includes("caret-color") ||
    name.includes("accent-color") ||
    name.includes(
      "column-rule-color"
    ) ||
    name.includes(
      "text-decoration-color"
    )
  ) {
    return "#475569";
  }

  if (
    name === "fill" ||
    name === "stop-color" ||
    name === "flood-color" ||
    name === "lighting-color"
  ) {
    return "#64748b";
  }

  if (
    name === "stroke"
  ) {
    return "#64748b";
  }

  if (
    name.includes(
      "background"
    )
  ) {
    return "#ffffff";
  }

  if (
    name.includes(
      "border"
    ) ||
    name.includes(
      "outline"
    )
  ) {
    return "#dbe2ea";
  }

  if (
    name.includes(
      "shadow"
    )
  ) {
    return "none";
  }

  if (
    name === "filter"
  ) {
    return "none";
  }

  return "initial";
}

function sanitizeStyleSheets(
  document: Document
) {
  const styles =
    Array.from(
      document.querySelectorAll(
        "style"
      )
    );

  for (
    const style of styles
  ) {
    if (
      !style.textContent
    ) {
      continue;
    }

    style.textContent =
      replaceColorFunctions(
        style.textContent,
        "#64748b"
      );
  }
}

function sanitizeCloneColors(
  document: Document,
  root: HTMLElement
) {
  const elements =
    Array.from(
      root.querySelectorAll(
        "*"
      )
    );

  elements.push(
    root
  );

  const view =
    document.defaultView;

  for (
    const element of elements
  ) {
    const htmlElement =
      element as HTMLElement;

    const computed =
      view?.getComputedStyle(
        htmlElement
      );

    if (computed) {
      for (
        let index = 0;
        index <
        computed.length;
        index += 1
      ) {
        const property =
          computed.item(
            index
          );

        if (!property) {
          continue;
        }

        const value =
          computed.getPropertyValue(
            property
          );

        if (
          !containsUnsupportedColor(
            value
          )
        ) {
          continue;
        }

        htmlElement.style.setProperty(
          property,
          fallbackForProperty(
            property
          ),
          "important"
        );
      }
    }

    const inlineStyle =
      htmlElement.getAttribute(
        "style"
      );

    if (
      inlineStyle &&
      containsUnsupportedColor(
        inlineStyle
      )
    ) {
      htmlElement.setAttribute(
        "style",
        replaceColorFunctions(
          inlineStyle,
          "#64748b"
        )
      );
    }
  }
}

async function waitForElement(
  selector: string,
  timeout = 15000
): Promise<HTMLElement | null> {
  const started =
    Date.now();

  while (
    Date.now() -
      started <
    timeout
  ) {
    const element =
      document.querySelector(
        selector
      ) as HTMLElement | null;

    if (
      element &&
      element.getBoundingClientRect()
        .width > 0 &&
      element.getBoundingClientRect()
        .height > 0
    ) {
      return element;
    }

    await wait(250);
  }

  return null;
}

async function captureElement(
  element: HTMLElement,
  name: string
): Promise<string | null> {
  try {
    if (!element.isConnected) {
      console.warn(
        `[Reports] Cannot capture detached element: ${name}`
      );
      return null;
    }
    element.setAttribute(
      "data-report-capture",
      name
    );

    await wait(700);
    if (!element.isConnected) {
      console.warn(
        `[Reports] Element was detached before capture: ${name}`
      );
      return null;
    }

    const canvas =
      await html2canvas(
        element,
        {
          backgroundColor:
            "#ffffff",

          useCORS: true,

          allowTaint: false,

          logging: false,

          scale: Math.min(
            window.devicePixelRatio ||
              1,
            2
          ),

          imageTimeout: 15000,

          ignoreElements: (candidate) =>
            candidate instanceof HTMLCanvasElement &&
            candidate.closest(".report-building-3d") !== null,

          scrollX: 0,

          scrollY:
            -window.scrollY,

          onclone:
            (
              clonedDocument
            ) => {
              sanitizeStyleSheets(
                clonedDocument
              );

              const clonedElement =
                clonedDocument.querySelector(
                  `[data-report-capture="${name}"]`
                ) as HTMLElement | null;

              if (
                clonedElement
              ) {
                sanitizeCloneColors(
                  clonedDocument,
                  clonedElement
                );
              }
            },
        }
      );

    return canvas.toDataURL(
      "image/png"
    );
  } catch (error) {
    console.error(
      `[Reports] Failed to capture ${name}:`,
      error
    );

    return null;
  }
}

function getFloorButtons(
  container: HTMLElement
): HTMLButtonElement[] {
  return Array.from(
    container.querySelectorAll(
      "button"
    )
  ).filter(
    (
      button
    ): button is HTMLButtonElement => {
      const label =
        button.textContent
          ?.trim() ?? "";

      return (
        label ===
          "Ground" ||
        /^Floor\s+\d+$/i.test(
          label
        )
      );
    }
  );
}

function getSelectedFloorIndex(
  buttons: HTMLButtonElement[]
) {
  const selected =
    buttons.findIndex(
      (button) => {
        const className =
          button.className;

        return (
          typeof className ===
            "string" &&
          (
            className.includes(
              "bg-blue-600"
            ) ||
            className.includes(
              "border-blue-600"
            )
          )
        );
      }
    );

  return selected >= 0
    ? selected
    : 0;
}

async function nextAnimationFrame() {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

async function captureWebGLCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  if (canvas.width < 2 || canvas.height < 2) return null;

  try {
    await nextAnimationFrame();
    await nextAnimationFrame();

    const image = canvas.toDataURL("image/png");
    if (!image.startsWith("data:image/png;base64,") || image.length < 5000) return null;

    const decoded = new Image();
    decoded.src = image;
    await new Promise<void>((resolve, reject) => {
      decoded.onload = () => resolve();
      decoded.onerror = () => reject(new Error("Captured WebGL image could not be decoded."));
    });

    const probe = document.createElement("canvas");
    probe.width = 32;
    probe.height = 32;
    const context = probe.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(decoded, 0, 0, 32, 32);
    const pixels = context.getImageData(0, 0, 32, 32).data;
    let min = 255;
    let max = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const luminance = Math.round((pixels[index] * 0.299) + (pixels[index + 1] * 0.587) + (pixels[index + 2] * 0.114));
      min = Math.min(min, luminance);
      max = Math.max(max, luminance);
    }
    if (max - min < 8) return null;
    return image;
  } catch (error) {
    console.error("[Reports] WebGL canvas export failed:", error);
    return null;
  }
}

export async function captureArchitectureReportVisuals(
  projectId: number | string
) {
  if (typeof window === "undefined") return;

  console.info("[Reports] Starting architecture visual capture.");

  const visualUpdate: {
    architectureMap?: string;
    floorPlans?: FloorReportSnapshot[];
    building3D?: string;
  } = {};

  const mapElement = await waitForElement(".report-design-map", 30000);
  if (mapElement) {
    const image = await captureElement(mapElement, "architecture-map");
    if (image) {
      visualUpdate.architectureMap = image;
      console.info("[Reports] Architecture 2D site map captured.");
    } else {
      console.error("[Reports] Architecture 2D site map capture returned no image.");
    }
  } else {
    console.error("[Reports] .report-design-map was not found or had no visible size.");
  }

  const floorElement = await waitForElement(".report-floor-plan", 30000);
  const floorPlans: FloorReportSnapshot[] = [];
  if (floorElement) {
    const initialButtons = getFloorButtons(floorElement);
    if (initialButtons.length) {
      const originalIndex = getSelectedFloorIndex(initialButtons);
      const floorCount = initialButtons.length;
      const floorLabels = initialButtons.map((button, index) =>
        button.textContent?.trim() || (index === 0 ? "Ground" : `Floor ${index + 1}`)
      );
      for (let index = 0; index < floorCount; index += 1) {
        const currentContainer = await waitForElement(".report-floor-plan", 10000);
        if (!currentContainer) break;
        const currentButtons = getFloorButtons(currentContainer);
        const targetButton = currentButtons[index];
        if (!targetButton || !targetButton.isConnected) {
          console.warn(`[Reports] Floor selector ${index + 1} is no longer available.`);
          continue;
        }
        targetButton.click();
        await nextAnimationFrame();
        await nextAnimationFrame();
        const updatedContainer = await waitForElement(".report-floor-plan", 10000);
        if (!updatedContainer || !updatedContainer.isConnected) continue;
        const image = await captureElement(updatedContainer, `floor-plan-${index + 1}`);
        if (!image) continue;
        floorPlans.push({ floor: index, label: floorLabels[index], image });
        console.info(`[Reports] Captured ${floorPlans[floorPlans.length - 1].label}.`);
      }
      const restoreContainer = await waitForElement(".report-floor-plan", 10000);
      if (restoreContainer) {
        getFloorButtons(restoreContainer)[originalIndex]?.click();
        await nextAnimationFrame();
      }
    } else {
      const image = await captureElement(floorElement, "floor-plan-ground");
      if (image) floorPlans.push({ floor: 0, label: "Ground", image });
    }
  } else {
    console.error("[Reports] .report-floor-plan was not found or had no visible size.");
  }
  if (floorPlans.length) visualUpdate.floorPlans = floorPlans;

  const buildingElement = await waitForElement(".report-building-3d", 30000);
  if (buildingElement) {
    const canvas = await waitForElement(".report-building-3d canvas", 30000) as HTMLCanvasElement | null;
    if (canvas && canvas.width > 1 && canvas.height > 1) {
      const image = await captureWebGLCanvas(canvas);
      if (image) {
        visualUpdate.building3D = image;
        console.info("[Reports] Interactive 3D building canvas captured and image-validated.");
      } else {
        console.error("[Reports] WebGL canvas returned an empty or uniform image. Ensure the 3D scene has rendered and preserveDrawingBuffer is enabled.");
      }
    }
    if (!visualUpdate.building3D) {
      const image = await captureElement(buildingElement, "building-3d-fallback");
      if (image) {
        visualUpdate.building3D = image;
        console.info("[Reports] 3D building DOM fallback captured.");
      }
    }
  } else {
    console.error("[Reports] .report-building-3d was not found or had no visible size.");
  }

  const capturedCount =
    Number(Boolean(visualUpdate.architectureMap)) +
    Number(Boolean(visualUpdate.building3D)) +
    (visualUpdate.floorPlans?.length ?? 0);

  if (!capturedCount) {
    throw new Error("No architecture snapshots were captured. Nothing was written to report storage.");
  }

  await mergeReportVisuals(projectId, visualUpdate);
  const saved = await getReportVisuals(projectId);
  const verified = Boolean(
    saved &&
    (!visualUpdate.architectureMap || saved.architectureMap) &&
    (!visualUpdate.building3D || saved.building3D) &&
    (!visualUpdate.floorPlans || saved.floorPlans.length >= visualUpdate.floorPlans.length)
  );
  if (!verified) throw new Error("Snapshot capture ran, but IndexedDB read-back verification failed.");

  console.info("[Reports] Architecture snapshots saved and verified:", {
    projectId: String(projectId),
    architectureMap: Boolean(saved?.architectureMap),
    floorPlans: saved?.floorPlans.length ?? 0,
    building3D: Boolean(saved?.building3D),
  });
}

export async function captureScenarioReportVisuals(
  projectId: number | string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  console.log(
    "[Reports] Waiting for scenario map..."
  );

  const mapElement =
    await waitForElement(
      ".report-scenario-map"
    );

  if (!mapElement) {
    console.warn(
      "[Reports] Scenario map was not rendered within 15 seconds."
    );

    return;
  }

  console.log(
    "[Reports] Scenario map found."
  );

  const image =
    await captureElement(
      mapElement,
      "scenario-map"
    );

  if (!image) {
    console.warn(
      "[Reports] Scenario map capture failed."
    );

    return;
  }

  await mergeReportVisuals(projectId, { scenarioMap: image, scenarioDesign: image });
  const saved = await getReportVisuals(projectId);
  if (!saved?.scenarioMap || !saved.scenarioDesign) {
    throw new Error("Scenario map was captured but could not be verified in report storage.");
  }
  console.info("[Reports] Scenario map captured, saved and verified.");
}