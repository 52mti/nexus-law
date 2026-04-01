import { useState, useRef, useEffect, useMemo } from "react";
import { App, Button } from "antd";
import {
  CopyOutlined,
  DownloadOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { PortalSidebar } from "@/components/layout/PortalSidebar";
import { SmartSidebar, type SidebarSchema } from "@/components/SmartSidebar";
import { useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
// 🚀 1. 引入定义好的 API 函数
import { searchRegulationApi, fetchDocType } from "@/api/regulation";

export const LegalSearchPage = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(Boolean(id));

  // 🚀 3. 新增状态：存放动态获取的法律下拉选项
  const [docTypeOptions, setDocTypeOptions] = useState<
    { label: string; value: string }[]
  >([
    { label: t("WHROQYh-pDb9MgLg2RSmU"), value: "" }, // 默认占位符
  ]);

  const [docData, setDocData] = useState<{
    title: string;
    markdownContent: string;
  } | null>(null);
  const [historyFormValues, setHistoryFormValues] = useState<any>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // 🚀 2. 剥离出静态的基础配置（把 options 置空，等待动态注入）
  const baseDocSchema: SidebarSchema = {
    title: t("-12qwY0PC7PpbQh4_MKXF"),
    submitText: t("toepebiMD8WxhwGqE2uPQ"),
    submitHint: t("-ZBMD7RdKnBp5zkjsba2X"),
    hasSceneSwitch: false,
    categories: [
      {
        id: "legal_search",
        title: "",
        formFields: [
          {
            name: "docType",
            label: t("bR1faWtplY_I9NvQTPZh3"),
            type: "select",
            placeholder: t("Vf-eygv5pJxyv29T0vASc"),
            options: [], // 这里置空，稍后由组件内部动态填充
          },
          {
            name: "partyA",
            label: t("L5xpSenbz4WJwMMLEfqo7"),
            type: "input",
            placeholder: t("qW-Idgvp7HX75QZiI99FJ"),
          },
          {
            name: "partyB",
            label: t("8XUdYlO1xq6cUK6o7U4gN"),
            type: "textarea",
            maxLength: 300,
            placeholder: t("5rkUqX0X_xjJxwZbm11gE"),
            required: true,
          },
        ],
      },
    ],
  };

  // 🚀 4. 组件挂载时，请求法律门类接口
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await fetchDocType();
        if (res.successful && res.data?.records) {
          // 将后端的 records 映射成前端需要的 { label, value } 格式
          const options = res.data.records.map((record) => ({
            label: record.name,
            // 💡 神级优化：直接拿 name 当 value，这样表单 submit 时直接就是中文，无需再做 Map 映射！
            value: record.name,
          }));
          setDocTypeOptions(options);
        }
      } catch (err) {
        console.error("获取条文类型失败:", err);
        message.error(t("kykC5LX58b6EnR3FOCBgI"));
      }
    };

    loadOptions();
  }, [message]);

  // 🚀 5. 使用 useMemo 动态拼装最终的 Sidebar Schema
  const dynamicSchema = useMemo(() => {
    return {
      ...baseDocSchema,
      categories: baseDocSchema.categories.map((cat) => ({
        ...cat,
        formFields: cat.formFields.map((field) =>
          // 找到 docType 这个字段，把刚刚请求回来的 options 塞进去
          field.name === "docType"
            ? { ...field, options: docTypeOptions }
            : field,
        ),
      })),
    };
  }, [docTypeOptions]);

  // 页面初始化 & 历史记录拉取
  useEffect(() => {
    if (id) {
      fetchHistoryData(id);
    } else {
      setDocData(null);
      setHistoryFormValues(null);
    }
  }, [id]);

  const fetchHistoryData = async (documentId: string) => {
    setLoading(true);
    try {
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            // 注意：因为 value 变成了中文，历史记录的回显这里也应该是中文
            docType: t("UAZPpgBTIJgpvDONXsYcr"),
            partyA: "",
            partyB: t("T96TICuaZHAy8JmFBeXCm"),
          },
          generatedResult: {
            title: t("DY7mWmSdNrDwnPZE2zsAu"),
            markdownContent: t("vSGtfOKs_RHxNkbqXCKlh"),
          },
        };
        setHistoryFormValues(mockResponse.formValues);
        setDocData(mockResponse.generatedResult);
        setLoading(false);
      }, 800);
    } catch (error) {
      message.error(t("7gEeqjRG-8JBLFMo_Ol_G"));
      setLoading(false);
    }
  };

  // 🚀 6. 极简版 Submit，无需再维护 lawMap
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      // 因为我们把 value 直接设置成了 record.name，所以 values.docType 拿到的直接是 "公司法"、"不限/综合匹配" 等
      let lawTypeStr = values.docType || t("Vt_O0DK8M4pHvxNTaer0C");

      // 稍微处理一下后端的特殊名称兜底
      if (lawTypeStr === t("SeQbeqzJYI_HTlO_MsNDx") || lawTypeStr === "ANY") {
        lawTypeStr = t("Vt_O0DK8M4pHvxNTaer0C");
      }

      const articleNumberStr = values.partyA || undefined;
      const keywordStr = values.partyB;

      // 发起真实的 API 请求
      const res = await searchRegulationApi({
        lawType: lawTypeStr,
        articleNumber: articleNumberStr,
        keyword: keywordStr,
      });

      if (res.code === 200 || res.code === 0) {
        setDocData({
          title: t("DY7mWmSdNrDwnPZE2zsAu"),
          markdownContent: res.data,
        });
        message.success(t("d1ERHF2PJJ1twOm4UtGH7"));
      } else {
        message.error(res.message || t("VOKXsXqVnXQyt4Fs-AV-d"));
      }
    } catch (error) {
      console.error("检索请求异常:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!paperRef.current) return;
    const textToCopy = paperRef.current.innerText;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success(t("rzDlGvz7sXbl6bygQc2qK")))
      .catch(() => message.error(t("w8mZWy1TYZfrI-B-fKlnW")));
  };

  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || t("ec_U3Y_ZsQIac5TRSBEtk"),
    onAfterPrint: () => message.success(t("iOG-eFwD9sUZjVmAn0-1G")),
  });

  return (
    <div className="flex h-full bg-gray-50">
      <PortalSidebar>
        <SmartSidebar
          schema={dynamicSchema} // 🚀 传入动态生成的 schema
          onSubmit={handleSubmit}
          isLoading={loading}
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center relative">
        {loading && (
          <div className="flex flex-col h-full items-center justify-center text-center animate-fade-in">
            <div className="mb-6">
              <BookOutlined className="text-[80px] text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-wide mb-2">
              {t("bEx0e0O3N-WCrnZoG18wM")}{" "}
            </h2>
            <p className="text-[15px] text-gray-500">
              {t("y-UkRZxTxcsbW3LpNE2Bz")}{" "}
            </p>
          </div>
        )}

        {!docData && !loading && (
          <div className="flex h-full items-center justify-center text-gray-400">
            {t("WV18--Jh4o_1d0jTzepDi")}{" "}
          </div>
        )}

        {docData && !loading && (
          <div className="w-full h-full flex flex-col gap-6 max-w-4xl">
            <div
              id="legal-document-paper"
              ref={paperRef}
              className="flex-1 bg-white shadow-lg rounded-sm p-12 text-gray-800 overflow-y-scroll custom-scrollbar animate-fade-in print:shadow-none"
            >
              <div
                className="
                prose prose-slate max-w-none 
                prose-h1:text-3xl prose-h1:text-center prose-h1:tracking-widest prose-h1:mb-10
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2 prose-h2:text-primary
                prose-h3:text-lg prose-h3:mt-6 prose-h3:font-bold prose-h3:text-gray-800
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:mt-4 prose-blockquote:text-gray-700 prose-blockquote:font-serif
                prose-strong:text-black prose-strong:font-bold
              "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {docData.markdownContent}
                </ReactMarkdown>
              </div>
            </div>

            <div className="flex gap-4 m-auto">
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={handleCopy}
              >
                {t("nbTIU5hk7boHfh8nJm9jT")}{" "}
              </Button>
              <Button
                className="bg-green-600 text-white hover:bg-green-500 border-none"
                icon={<DownloadOutlined />}
                onClick={handleDownloadPDF}
              >
                {t("uCa1Y6ndA6Wjk80c2DdMt")}{" "}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalSearchPage;
