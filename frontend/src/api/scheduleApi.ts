/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosClient from "./axiosClient";
import type { GAResult } from "../data/types";

export const scheduleApi = {
  generate: (data: any) => {
    return axiosClient.post<GAResult>("/schedule/", data);
  },
};