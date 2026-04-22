import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { authService } from "../utils/auth";

const Verify = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderData, setOrderData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyOrder = async () => {
      // Get token from URL query parameter
      const qrToken = searchParams.get("token");

      if (!qrToken) {
        setError("No QR token provided in URL");
        setLoading(false);
        return;
      }

      try {
        // Call verify API with cookies automatically sent
        const response = await axios.get(
          `http://localhost:3000/api/verify?token=${qrToken}`,
          {
            withCredentials: true, // Enable sending cookies with request
          }
        );

        // Set order data on success
        setOrderData(response.data);
        setError("");
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Verification failed. Invalid or expired token."
        );
        setOrderData(null);
      } finally {
        setLoading(false);
      }
    };

    verifyOrder();
  }, [searchParams]);

  const handleLogout = () => {
    authService.removeToken();
    navigate("/login");
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Verifying order...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>Order Verification</h1>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <div style={styles.errorContent}>
                <h3 style={styles.errorTitle}>❌ Verification Failed</h3>
                <p style={styles.errorMessage}>{error}</p>
              </div>
            </div>
          )}

          {orderData && (
            <div style={styles.successBox}>
              <div style={styles.badge}>
                <span style={styles.checkIcon}>✓</span>
                <span style={styles.badgeText}>Verified</span>
              </div>

              <div style={styles.detailsContainer}>
                <div style={styles.detailItem}>
                  <h3 style={styles.detailLabel}>Order ID</h3>
                  <p style={styles.detailValue}>{orderData.order.id}</p>
                </div>

                <div style={styles.detailItem}>
                  <h3 style={styles.detailLabel}>Product Name</h3>
                  <p style={styles.detailValue}>
                    {orderData.order.product.name}
                  </p>
                </div>

                <div style={styles.detailItem}>
                  <h3 style={styles.detailLabel}>Customer Name</h3>
                  <p style={styles.detailValue}>
                    {orderData.order.supplier.name}
                  </p>
                </div>

                {orderData.supplierInfo && (
                  <div style={styles.detailItem}>
                    <h3 style={styles.detailLabel}>Supplier Information</h3>
                    <p style={styles.detailValue}>
                      {typeof orderData.supplierInfo === "object"
                        ? JSON.stringify(orderData.supplierInfo, null, 2)
                        : orderData.supplierInfo}
                    </p>
                  </div>
                )}

                {orderData.verifiedAt && (
                  <div style={styles.detailItem}>
                    <h3 style={styles.detailLabel}>Verified At</h3>
                    <p style={styles.detailValueSmall}>
                      {new Date(orderData.verifiedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!error && !orderData && (
            <div style={styles.noData}>
              <p>No order data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px",
  },
  wrapper: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    padding: "30px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#333",
  },
  logoutButton: {
    padding: "10px 20px",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  errorBox: {
    backgroundColor: "#fee",
    borderLeft: "4px solid #dc2626",
    padding: "20px",
    marginBottom: "30px",
    borderRadius: "4px",
  },
  errorContent: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  errorTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#991b1b",
  },
  errorMessage: {
    fontSize: "14px",
    color: "#b91c1c",
  },
  successBox: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: "8px",
    padding: "30px",
  },
  badge: {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px",
    gap: "10px",
  },
  checkIcon: {
    fontSize: "32px",
    color: "#16a34a",
  },
  badgeText: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#166534",
  },
  detailsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  detailItem: {
    borderBottom: "1px solid #d1fae5",
    paddingBottom: "10px",
  },
  detailLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#666",
    marginBottom: "5px",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: "18px",
    color: "#111",
    fontWeight: "500",
  },
  detailValueSmall: {
    fontSize: "14px",
    color: "#333",
  },
  noData: {
    textAlign: "center",
    padding: "40px",
    color: "#999",
  },
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginTop: "20px",
    color: "#666",
    fontSize: "16px",
  },
};

// Add keyframe animation for spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(
  `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`,
  styleSheet.cssRules.length
);

export default Verify;
