import axios, {AxiosError, AxiosInstance, AxiosResponse} from "axios";
import {ApiResponse, ApiResponseFactory, FailApiResponse} from "@/bootstrap/apiClient/ApiResponse";

type ServerResponseError =
    | {
        message: string;
        code: string;
        type: string;
    } | {} | string;

class ApiClient {

    private makeAxiosInstance(): AxiosInstance {
        const headers: Record<string, string> = {
            "Content-type": "application/json",
            "Accept": "application/json",
            "Pragma": "no-cache",
        };
        if (localStorage.getItem('tokenData')) {
            const tokenData = JSON.parse(localStorage.getItem('tokenData') || "");

            if (tokenData && tokenData.token) {
                headers.Authorization = `Bearer ${tokenData.token}`;
            }
        }

        return axios.create({
            baseURL: "http://localhost:8082/api",
            headers: headers,
        });
    }

    private handleError(error: AxiosError): FailApiResponse {
        let modifyResponse: FailApiResponse = ApiResponseFactory.makeFail("Unknown error");

        if (error.response && error.response.data) {
            let errorMessage = "";
            const serverError: ServerResponseError = error.response.data;

            if (typeof serverError === "string") {
                errorMessage = serverError;
            } else if (serverError) {
                if ("message" in serverError) {
                    errorMessage = serverError['message'];
                } else if ("data" in serverError) {
                    errorMessage = serverError['data']['message'];
                }

                if ("code" in serverError) {
                    if (serverError['code'] === 401) {
                        localStorage.removeItem('tokenData')
                        errorMessage = "Go to <a href='/login'>Login</a>";
                    }
                }
            }
            modifyResponse = ApiResponseFactory.makeFail(errorMessage);
        } else if (error.message) {
            modifyResponse = ApiResponseFactory.makeFail(error.message);
        }

        return modifyResponse;
    }
    async post<T>(url: string, data: Record<string, unknown>): Promise<ApiResponse<T>> {
        const axiosInstance = this.makeAxiosInstance();

        let modifyResponse: ApiResponse<T> = ApiResponseFactory.makeFail("Unknown error");

        await axiosInstance.request({
            method: "post",
            url,
            data
        }).then((response: AxiosResponse<any>) => {
            if ("status" in response.data && response.data.status != "success") {
                modifyResponse = this.handleError(response.data);
            } else {
                if ("data" in response.data) {
                    modifyResponse = ApiResponseFactory.makeSuccess(response.data.data);
                } else {
                    modifyResponse = ApiResponseFactory.makeSuccess(response.data);
                }
            }
        }).catch((error: AxiosError) => {
            modifyResponse = this.handleError(error);
        })

        return modifyResponse;
    }
}

const apiClient = new ApiClient();
export default apiClient;
