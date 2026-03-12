import axiosClient from "./axiosClient";
import type { TimeSlot } from "../data/types";

export const timeslotApi = {
  getAll: () => axiosClient.get<TimeSlot[]>("/timeslots/timeslots/"),

  getById: (id: number) =>
    axiosClient.get<TimeSlot>(`/timeslots/timeslots/${id}`),

  create: (data: TimeSlot) =>
    axiosClient.post<TimeSlot>("/timeslots/timeslots/", data),

  update: (id: number, data: TimeSlot) =>
    axiosClient.put<TimeSlot>(`/timeslots/timeslots/${id}`, data),

  delete: (id: number) =>
    axiosClient.delete(`/timeslots/timeslots/${id}`),
};