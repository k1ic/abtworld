import React from 'react';
import Grid from '@material-ui/core/Grid';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';

export default function Footer() {
  const footers = [
    {
      title: 'ArcBlock',
      items: [
        {
          title: '官网',
          link: 'https://www.arcblockio.cn/zh/',
        },
        {
          title: '链网',
          link: 'https://explorer.abtnetwork.io/',
        },
        {
          title: '钱包',
          link: 'https://abtwallet.io/',
        },
        {
          title: '文档',
          link: 'https://docs.arcblockio.cn/zh/docs/intro/quickstart',
        },
        {
          title: '技术社区',
          link: 'https://community.arcblockio.cn/',
        },
        {
          title: '游乐场',
          link: 'https://playground.wallet.arcblockio.cn/',
        },
        {
          title: '周报',
          link: 'https://github.com/ArcBlock/weekly-digest',
        },
        {
          title: 'Github',
          link: 'https://github.com/ArcBlock',
        },
        {
          title: 'Github-2',
          link: 'https://github.com/wangshijun',
        },
      ],
    },
    {
      title: '生态伙伴',
      items: [
        { 
          title: '首汽共享汽车', 
          link: 'https://gfcexplorer.shouqiev.com/' 
        },
        { 
          title: '引力波互动', 
          link: 'http://www.gravitywavegame.com/' 
        },
        {
          title: '华泰证券',
          link: 'https://www.htsc.com.cn/',
        },
        {
          title: '无涯社区',
          link: 'http://www.ourea.top/',
        },
        {
          title: '熵湾科技',
          link: '/',
        },
      ],
    },
    {
      title: '社区',
      items: [
        { 
          title: 'ABT世界', 
          link: '/',
        },
        {
          title: '陌链',
          link: 'https://ios.lmxoh.cn/download/5dde26a05f119.html',
        },
        {
          title: '3456io区块导航',
          link: 'http://3456.io/',
        },
        {
          title: 'ABT共识社区',
          link: 'https://mp.weixin.qq.com/s/j173J-e_MtnquX7sZPDf7w',
        },
        { 
          title: 'Github',  
          link: 'https://github.com/helloabt',
        },
      ],
    },
    {
      title: '广告',
      items: [
        {
          title: '大地云仓',
          link: 'http://wap.bb.dadiyuncang.com/pages/users/register?recommend=11826',
        },
      ],
    },
  ];

  return (
    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #DEDEDE' }}>
      <Container>
        <Grid container spacing={4}>
          {footers.map(x => (
            <Grid item xs={6} sm={4} md={3} key={x.title}>
              <Typography variant="h6" color="textPrimary" gutterBottom>
                {x.title}
              </Typography>
              <ul style={{ padding: '0 0 0 16px' }}>
                {x.items.map(item => (
                  <li key={item.title}>
                    <Typography
                      component="a"
                      href={item.link}
                      variant="subtitle1"
                      color="textSecondary"
                      target="_blank">
                      {item.title}
                    </Typography>
                  </li>
                ))}
              </ul>
            </Grid>
          ))}
        </Grid>
      </Container>
    </div>
  );
}
