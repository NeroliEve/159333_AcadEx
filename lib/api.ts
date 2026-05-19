export type ApiSuccess<T> = {
  data: T;
  status: "success";
};

export type ApiError = {
  message: string;
  status: "error";
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { data, status: "success" };
}

export function apiError(message: string): ApiError {
  return { message, status: "error" };
}
