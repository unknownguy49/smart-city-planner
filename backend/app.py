import time
import gradio as gr
import spaces
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from app.main import app as fastapi_app

# Trust Hugging Face's X-Forwarded-Proto: https header so slash redirects stay https://
fastapi_app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

@spaces.GPU
def gpu_healthcheck():
    return "GPU & Smart City API Ready"

with gr.Blocks() as demo:
    gr.Markdown("# Smart City Backend API is Running")
    btn = gr.Button("Check Status")
    out = gr.Textbox(label="Status")
    btn.click(fn=gpu_healthcheck, outputs=out)

if __name__ == "__main__":
    gradio_fastapi_app, _, _ = demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        ssr_mode=False,
        prevent_thread_lock=True,
    )
    gradio_fastapi_app.mount("/v1", fastapi_app)
    while True:
        time.sleep(3600)
