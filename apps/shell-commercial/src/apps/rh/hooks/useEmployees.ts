import { useState, useEffect, useCallback } from "react";
import { useDrivers } from "../../../lib/drivers-context";
import { rowToEmployee, type Employee } from "../types";

const PAGE_SIZE = 20;

interface UseEmployeesOptions {
  status?: string | undefined;
  department?: string | undefined;
  search?: string | undefined;
}

export function useEmployees(opts: UseEmployeesOptions = {}) {
  const drivers = useDrivers();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (drivers === null) return;
    setLoading(true);
    try {
      let q = drivers.data
        .from("employees")
        .select("*", { count: "exact" })
        .is("deleted_at", null)
        .order("full_name", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (opts.status) q = q.eq("status", opts.status);
      if (opts.department) q = q.eq("department", opts.department);
      if (opts.search) q = q.ilike("full_name", `%${opts.search}%`);

      const { data, count, error } = await q;
      if (error !== null) return;
      setEmployees(
        (data ?? []).map((r: unknown) =>
          rowToEmployee(r as Record<string, unknown>),
        ),
      );
      setTotal(count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [drivers, page, opts.status, opts.department, opts.search]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return {
    employees,
    total,
    page,
    setPage,
    loading,
    refresh: fetch,
    pageSize: PAGE_SIZE,
  };
}

export function useDepartments(): string[] {
  const drivers = useDrivers();
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    if (drivers === null) return;
    void drivers.data
      .from("employees")
      .select("department")
      .is("deleted_at", null)
      .not("department", "is", null)
      .then(({ data }) => {
        const unique = [
          ...new Set(
            (data ?? [])
              .map(
                (r: unknown) =>
                  (r as Record<string, unknown>)["department"] as string,
              )
              .filter(Boolean),
          ),
        ].sort();
        setDepartments(unique);
      });
  }, [drivers]);

  return departments;
}
