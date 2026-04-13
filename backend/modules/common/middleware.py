import time
import uuid
from fastapi import Request
from fastapi.responses import JSONResponse


def install_middleware(app, logger):
    @app.middleware('http')
    async def request_logging_middleware(request: Request, call_next):
        request_id = request.headers.get('x-request-id', uuid.uuid4().hex)
        request.state.request_id = request_id
        started_at = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
            logger.exception(
                'request_failed request_id=%s method=%s path=%s duration_ms=%s',
                request_id,
                request.method,
                request.url.path,
                duration_ms,
            )
            return JSONResponse(
                status_code=500,
                content={
                    'detail': 'Internal server error',
                    'request_id': request_id,
                },
            )

        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        response.headers['x-request-id'] = request_id
        logger.info(
            'request_completed request_id=%s method=%s path=%s status=%s duration_ms=%s',
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response
