import { createSlice } from "@reduxjs/toolkit";
import {
  cancelConnectionRequest,
  getConnectionRequests,
  getMyConnections,
  removeConnection,
  respondToConnectionRequest,
} from "../../action/connectionAction";
import { logoutUser } from "../../action/authAction";

const emptyList = { items: [], isLoading: false, error: "", fetched: false };

const initialState = {
  connections: { ...emptyList },
  received: { ...emptyList },
  sent: { ...emptyList },
};

const connectionSlice = createSlice({
  name: "connections",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getMyConnections.pending, (state) => {
        state.connections.isLoading = true;
        state.connections.error = "";
      })
      .addCase(getMyConnections.fulfilled, (state, action) => {
        state.connections = { items: action.payload, isLoading: false, error: "", fetched: true };
      })
      .addCase(getMyConnections.rejected, (state, action) => {
        state.connections.isLoading = false;
        state.connections.error = action.payload?.message || "Could not load connections";
      })
      .addCase(getConnectionRequests.pending, (state, action) => {
        const list = state[action.meta.arg.type];
        list.isLoading = true;
        list.error = "";
      })
      .addCase(getConnectionRequests.fulfilled, (state, action) => {
        state[action.payload.type] = {
          items: action.payload.requests,
          isLoading: false,
          error: "",
          fetched: true,
        };
      })
      .addCase(getConnectionRequests.rejected, (state, action) => {
        const list = state[action.meta.arg.type];
        list.isLoading = false;
        list.error = action.payload?.message || "Could not load requests";
      })
      .addCase(respondToConnectionRequest.fulfilled, (state, action) => {
        const { requestId, action: decision } = action.payload;
        const request = state.received.items.find((r) => r.requestId === requestId);
        state.received.items = state.received.items.filter((r) => r.requestId !== requestId);
        if (decision === "accept" && request) {
          state.connections.items.unshift({ ...request, since: new Date().toISOString() });
        }
      })
      .addCase(cancelConnectionRequest.fulfilled, (state, action) => {
        state.sent.items = state.sent.items.filter((r) => r.requestId !== action.payload.requestId);
      })
      .addCase(removeConnection.fulfilled, (state, action) => {
        state.connections.items = state.connections.items.filter(
          (c) => c.user._id !== action.payload.userId
        );
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export default connectionSlice.reducer;
