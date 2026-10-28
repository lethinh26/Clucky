"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  UserRound,
  MapPin,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import styles from "./account.module.css";
type Profile = { fullName: string; email: string; phone: string };
type Address = {
  id: string;
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  isDefault: boolean;
};
const emptyAddress: Address = {
  id: "",
  receiverName: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  detail: "",
  isDefault: false,
};
const initialProfile: Profile = {
  fullName: "Khách hàng Clucky",
  email: "khachhang@example.com",
  phone: "",
};
const storageKey = "clucky_profile_ui_v1";
export default function AccountPage() {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(initialProfile);
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const value = JSON.parse(raw);
        if (
          value.profile &&
          ["fullName", "email", "phone"].every(
            (k) => typeof value.profile[k] === "string",
          ) &&
          Array.isArray(value.addresses) &&
          value.addresses.every(
            (a: Address) =>
              [
                "id",
                "receiverName",
                "phone",
                "province",
                "district",
                "ward",
                "detail",
              ].every((k) => typeof a[k as keyof Address] === "string") &&
              typeof a.isDefault === "boolean",
          )
        ) {
          setProfile(value.profile);
          setSavedProfile(value.profile);
          setAddresses(value.addresses);
        }
      }
    } catch {
      setError(
        "Không đọc được dữ liệu mẫu đã lưu. Bạn có thể nhập lại thông tin.",
      );
    }
    setReady(true);
  }, []);
  function save(
    nextProfile: Profile,
    nextAddresses: Address[],
    message: string,
  ) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ profile: nextProfile, addresses: nextAddresses }),
      );
      setSavedProfile(nextProfile);
      setAddresses(nextAddresses);
      setNotice(message);
      setError("");
      return true;
    } catch {
      setError("Không lưu được dữ liệu trên trình duyệt. Vui lòng thử lại.");
      return false;
    }
  }
  function changeTab(value: string) {
    setTab(value);
    setNotice("");
    setError("");
    setPassword({ current: "", next: "", confirm: "" });
  }
  function saveAddress(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const clean = {
      ...editing,
      ...Object.fromEntries(
        Object.entries(editing)
          .filter(([, v]) => typeof v === "string")
          .map(([k, v]) => [k, (v as string).trim()]),
      ),
    } as Address;
    if (
      ["receiverName", "province", "district", "ward", "detail"].some(
        (k) => !clean[k as keyof Address],
      )
    ) {
      setError("Vui lòng điền đầy đủ địa chỉ và người nhận.");
      return;
    }
    const item = {
      ...clean,
      id: clean.id || crypto.randomUUID(),
      isDefault: addresses.length === 0 || clean.isDefault,
    };
    let next = addresses.some((a) => a.id === item.id)
      ? addresses.map((a) => (a.id === item.id ? item : a))
      : [...addresses, item];
    if (item.isDefault)
      next = next.map((a) => ({ ...a, isDefault: a.id === item.id }));
    if (!next.some((a) => a.isDefault))
      next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
    if (save(savedProfile, next, "Đã lưu địa chỉ mẫu.")) setEditing(null);
  }
  return (
    <>
      <main className={styles.page}>
        <div className={styles.intro}>
          <span>YOUR CLUCKY · TÀI KHOẢN</span>
          <h1>Góc nhỏ của bạn.</h1>
          <p>Thông tin thân quen, để mỗi bữa ngon đến gần hơn.</p>
        </div>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.avatar}>
              <UserRound size={30} />
            </div>
            <strong>{savedProfile.fullName}</strong>
            <p>{savedProfile.email}</p>
            <nav aria-label="Quản lý tài khoản">
              {[
                ["profile", "Thông tin cá nhân", UserRound],
                ["addresses", "Sổ địa chỉ", MapPin],
                ["password", "Đổi mật khẩu", ShieldCheck],
              ].map(([key, label, Icon]) => (
                <button
                  key={key as string}
                  aria-current={tab === key ? "page" : undefined}
                  onClick={() => changeTab(key as string)}
                >
                  <Icon size={18} />
                  {label as string}
                </button>
              ))}
            </nav>
          </aside>
          <section className={styles.panel} aria-busy={!ready}>
            {notice && (
              <p role="status" className={styles.success}>
                {notice}
              </p>
            )}
            {error && !editing && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            {tab === "profile" && (
              <>
                <h2>Thông tin cá nhân</h2>
                <p className={styles.muted}>
                  Cập nhật thông tin liên hệ của bạn.
                </p>
                <form
                  className={styles.form}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!profile.fullName.trim()) {
                      setError("Vui lòng nhập họ và tên.");
                      return;
                    }
                    const clean = {
                      ...profile,
                      fullName: profile.fullName.trim(),
                      email: profile.email.trim(),
                    };
                    if (save(clean, addresses, "Đã lưu thông tin cá nhân mẫu."))
                      setProfile(clean);
                  }}
                >
                  <Input
                    label="Họ và tên"
                    required
                    maxLength={100}
                    value={profile.fullName}
                    onChange={(e) =>
                      setProfile({ ...profile, fullName: e.target.value })
                    }
                  />
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                  />
                  <Input
                    label="Số điện thoại"
                    type="tel"
                    pattern="[0-9+ ()-]{9,15}"
                    title="Nhập số điện thoại từ 9–15 ký tự"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                  />
                  <div className={styles.actions}>
                    <button
                      type="submit"
                      disabled={!ready}
                      className={styles.primary}
                    >
                      Lưu thay đổi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfile(savedProfile);
                        setError("");
                        setNotice("");
                      }}
                    >
                      Hủy thay đổi
                    </button>
                  </div>
                </form>
              </>
            )}
            {tab === "addresses" && (
              <>
                <div className={styles.heading}>
                  <div>
                    <h2>Sổ địa chỉ</h2>
                    <p className={styles.muted}>
                      {addresses.length} địa chỉ đã lưu
                    </p>
                  </div>
                  <button
                    className={styles.primary}
                    disabled={!ready}
                    onClick={() => {
                      setError("");
                      setEditing({
                        ...emptyAddress,
                        receiverName: savedProfile.fullName,
                        phone: savedProfile.phone,
                      });
                    }}
                  >
                    <Plus size={16} />
                    Thêm địa chỉ
                  </button>
                </div>
                {addresses.length === 0 ? (
                  <div className={styles.empty}>
                    <MapPin size={38} />
                    <h3>Chưa có địa chỉ nào</h3>
                    <p>
                      Thêm địa chỉ đầu tiên để sẵn sàng cho bữa ngon tiếp theo.
                    </p>
                  </div>
                ) : (
                  <div className={styles.addressList}>
                    {addresses.map((a) => (
                      <article key={a.id} className={styles.address}>
                        <div className={styles.heading}>
                          <strong>{a.receiverName}</strong>
                          {a.isDefault && (
                            <span className={styles.badge}>Mặc định</span>
                          )}
                        </div>
                        <p>{a.phone}</p>
                        <p>
                          {[a.detail, a.ward, a.district, a.province].join(
                            ", ",
                          )}
                        </p>
                        <div className={styles.actions}>
                          <button
                            onClick={() => {
                              setError("");
                              setEditing({ ...a });
                            }}
                          >
                            <Pencil size={14} />
                            Sửa
                          </button>
                          <button onClick={() => setDeleting(a)}>
                            <Trash2 size={14} />
                            Xóa
                          </button>
                          {!a.isDefault && (
                            <button
                              onClick={() =>
                                save(
                                  savedProfile,
                                  addresses.map((item) => ({
                                    ...item,
                                    isDefault: item.id === a.id,
                                  })),
                                  "Đã cập nhật địa chỉ mặc định.",
                                )
                              }
                            >
                              Đặt làm mặc định
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
            {tab === "password" && (
              <>
                <h2>Đổi mật khẩu</h2>
                <p className={styles.muted}>
                  Dùng mật khẩu mới có ít nhất 8 ký tự.
                </p>
                <p className={styles.demo}>
                  Chế độ UI: chỉ kiểm tra biểu mẫu. Mật khẩu không được lưu hoặc
                  thay đổi trên hệ thống.
                </p>
                <form
                  className={styles.form}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNotice("");
                    if (password.next === password.current) {
                      setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
                      return;
                    }
                    if (password.next !== password.confirm) {
                      setError("Mật khẩu xác nhận không khớp.");
                      return;
                    }
                    setError("");
                    setNotice(
                      "Biểu mẫu hợp lệ. Đây là bản mô phỏng; mật khẩu chưa được thay đổi.",
                    );
                    setPassword({ current: "", next: "", confirm: "" });
                  }}
                >
                  <Input
                    label="Mật khẩu hiện tại"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password.current}
                    onChange={(e) =>
                      setPassword({ ...password, current: e.target.value })
                    }
                  />
                  <Input
                    label="Mật khẩu mới"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password.next}
                    onChange={(e) =>
                      setPassword({ ...password, next: e.target.value })
                    }
                  />
                  <Input
                    label="Xác nhận mật khẩu mới"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password.confirm}
                    onChange={(e) =>
                      setPassword({ ...password, confirm: e.target.value })
                    }
                  />
                  <button className={styles.primary}>
                    Đổi mật khẩu (mô phỏng)
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </main>

      <Modal
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setError("");
          }
        }}
        title={editing?.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}
      >
        {editing && (
          <form className={styles.form} onSubmit={saveAddress}>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            {(
              [
                ["receiverName", "Tên người nhận"],
                ["phone", "Số điện thoại người nhận"],
                ["province", "Tỉnh / Thành phố"],
                ["district", "Quận / Huyện"],
                ["ward", "Phường / Xã"],
                ["detail", "Số nhà, tên đường"],
              ] as const
            ).map(([key, label]) => (
              <Input
                key={key}
                label={label}
                required
                maxLength={200}
                type={key === "phone" ? "tel" : "text"}
                pattern={key === "phone" ? "[0-9+ ()-]{9,15}" : undefined}
                value={editing[key]}
                onChange={(e) =>
                  setEditing({ ...editing, [key]: e.target.value })
                }
              />
            ))}
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={editing.isDefault || addresses.length === 0}
                disabled={addresses.length === 0}
                onChange={(e) =>
                  setEditing({ ...editing, isDefault: e.target.checked })
                }
              />
              Đặt làm địa chỉ mặc định
            </label>
            <div className={styles.actions}>
              <button className={styles.primary}>Lưu địa chỉ</button>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setError("");
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Xóa địa chỉ?"
        description="Địa chỉ này sẽ được xóa khỏi sổ địa chỉ mẫu."
      >
        <p>{deleting?.detail}</p>
        <div className={styles.actions}>
          <button onClick={() => setDeleting(null)}>Giữ lại</button>
          <button
            className={styles.primary}
            onClick={() => {
              let next = addresses.filter((a) => a.id !== deleting?.id);
              if (next.length && !next.some((a) => a.isDefault))
                next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
              if (save(savedProfile, next, "Đã xóa địa chỉ."))
                setDeleting(null);
            }}
          >
            Xác nhận xóa
          </button>
        </div>
      </Modal>
    </>
  );
}
