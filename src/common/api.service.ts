import { Injectable } from "@nestjs/common";
import axios, { AxiosRequestConfig, Method } from "axios";
import { throwIfZohoError } from "src/utils/zoho.utils";

export interface RequestOptions {
  url: string;
  method: Method;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
  bearerToken?: string;
}

@Injectable()
export class ApiService {
  async request<T = any>({
    url,
    method,
    params,
    data,
    headers = {},
    bearerToken,
  }: RequestOptions): Promise<T> {
    const config: AxiosRequestConfig = {
      url,
      method,
      params,
      data,
      headers: {
        ...headers,
        ...(bearerToken && {
          Authorization: `Bearer ${bearerToken}`,
        }),
      },
      validateStatus: () => true,
    };

    const response = await axios(config);
    throwIfZohoError(response.data);
    return response.data;
  }
}
