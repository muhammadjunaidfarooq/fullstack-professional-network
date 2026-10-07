import { clientServer } from "@/config";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { toRejectValue } from "../authAction";

export const getMyConnections = createAsyncThunk(
  "connections/getMyConnections",
  async (_, thunkAPI) => {
    try {
      const response = await clientServer.get("/api/connections");
      return response.data.connections;
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not load your connections"));
    }
  }
);

/** type: "received" | "sent" */
export const getConnectionRequests = createAsyncThunk(
  "connections/getConnectionRequests",
  async ({ type }, thunkAPI) => {
    try {
      const response = await clientServer.get("/api/connections/requests", { params: { type } });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not load requests"));
    }
  }
);

export const sendConnectionRequest = createAsyncThunk(
  "connections/sendConnectionRequest",
  async ({ userId }, thunkAPI) => {
    try {
      const response = await clientServer.post("/api/connections/requests", { userId });
      return { userId, connection: response.data.connection };
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not send the request"));
    }
  }
);

/** action: "accept" | "reject" */
export const respondToConnectionRequest = createAsyncThunk(
  "connections/respondToConnectionRequest",
  async ({ requestId, action }, thunkAPI) => {
    try {
      const response = await clientServer.patch(`/api/connections/requests/${requestId}`, {
        action,
      });
      return { requestId, action, connection: response.data.connection };
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not respond to the request"));
    }
  }
);

export const cancelConnectionRequest = createAsyncThunk(
  "connections/cancelConnectionRequest",
  async ({ requestId }, thunkAPI) => {
    try {
      const response = await clientServer.delete(`/api/connections/requests/${requestId}`);
      return { requestId, connection: response.data.connection };
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not cancel the request"));
    }
  }
);

export const removeConnection = createAsyncThunk(
  "connections/removeConnection",
  async ({ userId }, thunkAPI) => {
    try {
      const response = await clientServer.delete(`/api/connections/${userId}`);
      return { userId, connection: response.data.connection };
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not remove the connection"));
    }
  }
);
