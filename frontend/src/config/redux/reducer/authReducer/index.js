const { createSlice } = require("@reduxjs/toolkit");
const { loginUser } = require("../../action/authAction");

const initialState = {
  user: [],
  isError: false,
  isSuccess: false,
  isLoading: false,
  loggedIn: false,
  message: "",
  profileFetched: false,
  connections: [],
  connectionRequests: [],
};


extraReducers: (builder) => {
  builder

    .addCase(loginUser.pending, (state) => {
      state.isLoading = true;
      state.message = "knocking the door...";
    })

    .addCase(loginUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isError = false;
      state.isSuccess = true;
      state.loggedIn = true;
      state.message = "Login Successful";
    })

    .addCase(loginUser.rejected, (state, action) => {
      state.isLoading = false;
      state.isError = true;
      state.message = action.payload.message;
    })

    .addCase(registerUser.pending, (state) => {
      state.isLoading = true;
      state.message = "Registering user...";
    })

    .addCase(registerUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isError = false;
      state.isSuccess = true;
      state.message = "Registration Successful";
    })

    .addCase(registerUser.rejected, (state, action) => {
      state.isLoading = false;
      state.isError = true;
      state.message = action.payload.message;
    });
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: () => initialState,
    handleLoginUser: (state) => {
      state.message = "Hello";
    },
  },
});

export default authSlice.reducer;

