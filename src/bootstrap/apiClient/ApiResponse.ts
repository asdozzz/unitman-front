
export type FailApiResponse = {
    status: "fail";
    data: {
        message: string;
    };
}

export type ErrorApiResponse = {
    status: "error";
    message: string;
    code: string;
}

export type SuccessApiResponse<T> = {
    status: "success";
    data: T;
}

export type ApiResponse<T> = SuccessApiResponse<T> | FailApiResponse | ErrorApiResponse;

export class ApiResponseFactory {
    static makeFail(message: string): FailApiResponse {
        return {
            status: "fail",
            data: {
                message
            }
        }
    }

    static makeSuccess<T>(data: T): SuccessApiResponse<T> {
        return {
            status: "success",
            data
        }
    }
}
