import axiosClient from "./axiosClient";
import type { Room } from "../data/types";

export const roomApi = {
  getAll: () => axiosClient.get<Room[]>("/rooms/rooms/"),

  getById: (id: number) =>
    axiosClient.get<Room>(`/rooms/rooms/${id}`),

  create: (data: Room) =>
    axiosClient.post<Room>("/rooms/rooms/", data),

  update: (id: number, data: Room) =>
    axiosClient.put<Room>(`/rooms/rooms/${id}`, data),

  delete: (id: number) =>
    axiosClient.delete(`/rooms/rooms/${id}`),
};